const express        = require('express')
const crypto         = require('crypto')
const Board          = require('../models/Board')
const authenticate   = require('../middleware/authenticate')
const { authorizeBoard, requireOwner} = require('../middleware/authorize')

const router = express.Router()

//------------------------- Route 1 - Create a board --------------------------------------
// POST /api/boards
router.post('/', authenticate, async (req, res, next) => {
    try{
        const {title, background} = req.body

        if(!title){
            const err = new Error('title is required')
            err.status = 400
            return next(err)
        }

       const inviteToken = crypto.randomBytes(16).toString('hex')
       const board = await Board.create({
        title,
        background: background || 'linear-gradient(135deg, #1E1E24, #2A2A38)',
        ownerId: req.user.id,
        members: [{userId: req.user.id, role: 'owner', status: 'accepted'}],
        inviteToken
       })

        res.status(201).json(board)

    } catch(err){
        next(err)
    }
})

//-------------------------- GET /api/boards ----------------------------------

router.get('/', authenticate, async (req, res, next) => {
    try {
        const boards = await Board.find({
            members: {
                $elemMatch: {
                    userId: req.user.id,
                    status: { $in: ['accepted', null] }
                }
            }
        }).sort({ updatedAt: -1 })

        res.json(boards)

    } catch (err) {
        next(err)
    }
})

//-------------------------- GET /api/boards/invites/pending -------------------
router.get('/invites/pending', authenticate, async (req, res, next) => {
    try {
        const boards = await Board.find({
            members: {
                $elemMatch: {
                    userId: req.user.id,
                    status: 'pending'
                }
            }
        }).populate('ownerId', 'name username email avatar')

        const invites = boards.map(b => {
            const mem = b.members.find(m => m.userId.toString() === req.user.id)
            return {
                _id: b._id,
                boardId: b._id,
                title: b.title,
                background: b.background,
                owner: b.ownerId,
                role: mem ? mem.role : 'member',
                createdAt: b.updatedAt
            }
        })

        res.json({ invites })
    } catch (err) {
        next(err)
    }
})

//-------------------------- PATCH /api/boards/:boardId/invites/respond --------
router.patch('/:boardId/invites/respond', authenticate, async (req, res, next) => {
    try {
        const { action } = req.body
        const { boardId } = req.params

        if (!['accept', 'decline'].includes(action)) {
            const err = new Error('Invalid action. Must be accept or decline.')
            err.status = 400
            return next(err)
        }

        const board = await Board.findById(boardId)
        if (!board) {
            const err = new Error('Board not found')
            err.status = 404
            return next(err)
        }

        const memberIndex = board.members.findIndex(
            m => m.userId.toString() === req.user.id && m.status === 'pending'
        )

        if (memberIndex === -1) {
            const err = new Error('No pending invitation found for this board')
            err.status = 404
            return next(err)
        }

        if (action === 'accept') {
            board.members[memberIndex].status = 'accepted'
            await board.save()

            // Trigger Notification to Owner
            const { createNotification } = require('../utils/notify')
            await createNotification({
                recipientId: board.ownerId,
                senderId: req.user.id,
                type: 'GENERAL',
                title: 'Invite Accepted',
                message: `${req.user.username || 'A user'} accepted your invite to join "${board.title}"`,
                link: `/board/${board._id}`
            })

            const updatedBoard = await Board.findById(board._id).populate('members.userId', 'name username email avatar')
            return res.json({ message: 'Invitation accepted!', board: updatedBoard })
        } else {
            board.members.splice(memberIndex, 1)
            await board.save()
            return res.json({ message: 'Invitation declined.' })
        }
    } catch (err) {
        next(err)
    }
})

//-------------------------- GET /api/boards/invite-info/:inviteToken -----------
router.get('/invite-info/:inviteToken', async (req, res, next) => {
    try {
        const { inviteToken } = req.params
        const board = await Board.findOne({ inviteToken }).populate('ownerId', 'name username email avatar')
        if (!board) {
            const err = new Error('Invalid or expired invitation link')
            err.status = 404
            return next(err)
        }
        const acceptedMembersCount = board.members.filter(m => m.status === 'accepted' || !m.status).length
        res.json({
            boardId: board._id,
            title: board.title,
            background: board.background,
            owner: board.ownerId,
            memberCount: acceptedMembersCount
        })
    } catch (err) {
        next(err)
    }
})

//-------------------------- POST /api/boards/join-by-link/:inviteToken ----------
router.post('/join-by-link/:inviteToken', authenticate, async (req, res, next) => {
    try {
        const { inviteToken } = req.params
        const board = await Board.findOne({ inviteToken })
        if (!board) {
            const err = new Error('Invalid or expired invitation link')
            err.status = 404
            return next(err)
        }

        const existingMemberIndex = board.members.findIndex(
            m => m.userId.toString() === req.user.id
        )

        if (existingMemberIndex !== -1) {
            const member = board.members[existingMemberIndex]
            if (member.status !== 'accepted') {
                member.status = 'accepted'
                await board.save()
            }
        } else {
            board.members.push({
                userId: req.user.id,
                role: 'member',
                status: 'accepted'
            })
            await board.save()

            // Trigger notification to board owner
            const { createNotification } = require('../utils/notify')
            await createNotification({
                recipientId: board.ownerId,
                senderId: req.user.id,
                type: 'GENERAL',
                title: 'New Member Joined',
                message: `${req.user.username || 'A user'} joined your board "${board.title}" via link`,
                link: `/board/${board._id}`
            })
        }

        res.json({ message: 'Successfully joined board!', boardId: board._id })
    } catch (err) {
        next(err)
    }
})

//----------------------------------  Get a single board with its lists and cards ------------------------
// GET /api/boards/:boardId

router.get('/:boardId', authenticate, authorizeBoard, async (req, res,next) => {
    try{
    const List = require('../models/List')
    const Card = require('../models/Card')
    let board = req.board

    // Lazy generation of inviteToken for legacy boards
    if (!board.inviteToken) {
        board.inviteToken = crypto.randomBytes(16).toString('hex')
        await board.save()
    }

    let lists = await List.find({boardId: board._id}).sort({position: 1})

    // If board has no lists yet, auto-create default 3 lists: To Do, Doing, Done
    if (lists.length === 0) {
        const defaultListTitles = ['To Do', 'Doing', 'Done']
        const createdLists = []
        for (let i = 0; i < defaultListTitles.length; i++) {
            const list = await List.create({
                title: defaultListTitles[i],
                position: i + 1,
                boardId: board._id
            })
            createdLists.push(list)
        }
        lists = createdLists
    }

    const listWithCards = await Promise.all(
        lists.map(async list => {
            const cards = await Card.find({listId: list._id})
                .populate('assignedMembers', 'name username email avatar')
                .sort({position: 1})
            return {...list.toObject(), cards}
        })
    )

    // Populate member details (username & email)
    const populatedBoard = await Board.findById(board._id).populate('members.userId', 'name username email avatar')

    const boardObj = populatedBoard ? populatedBoard.toObject() : board.toObject()
    if (!boardObj.inviteToken) {
        boardObj.inviteToken = board.inviteToken
    }

    res.json({ ...boardObj, lists: listWithCards })

    } catch (err){
        next(err)
    }
})

//---------------------------------------- Edit Board ------------------------------------------
// PATCH /api/boards/:boardId
router.patch('/:boardId', authenticate, authorizeBoard, async (req, res, next) => {
    try {
        const { title, background, isStarred } = req.body
        const updates = {}
        if (title !== undefined) updates.title = title
        if (background !== undefined) updates.background = background
        if (isStarred !== undefined) updates.isStarred = isStarred

        const updatedBoard = await Board.findByIdAndUpdate(
            req.board._id,
            updates,
            { new: true }
        ).populate('members.userId', 'name username email avatar').populate('ownerId', 'name username email avatar')
        res.json(updatedBoard)
    } catch (err) {
        next(err)
    }
})

//---------------------------------------- Delete Board ------------------------------------------
// DELETE /api/boards/:boardId
router.delete('/:boardId', authenticate, authorizeBoard, requireOwner, async (req, res, next) => {
    try {
        const List = require('../models/List')
        const Card = require('../models/Card')
        const boardId = req.board._id

        // find all lists for this board
        const lists = await List.find({ boardId })
        const listIds = lists.map(l => l._id)

        // delete cards in these lists
        await Card.deleteMany({ listId: { $in: listIds } })
        // delete lists
        await List.deleteMany({ boardId })
        // delete board
        await Board.findByIdAndDelete(boardId)

        res.json({ message: 'Board deleted successfully' })
    } catch (err) {
        next(err)
    }
})

//---------------------------------------- Invite route ------------------------------------------
router.post('/:boardId/members', authenticate, authorizeBoard, requireOwner, async (req, res, next) => {
    try{
        const {username} = req.body
        const User = require('../models/User')  
        const { createNotification } = require('../utils/notify')

        if(!username){
            const err = new Error('Username is required')
            err.status = 400
            return next(err)   
        }

        const userToAdd = await User.findOne({ username })
        if (!userToAdd) {
          const err = new Error('User not found')
          err.status = 404
          return next(err)
        }

    const existingMember = req.board.members.find(
      member => member.userId.toString() === userToAdd._id.toString()
    )

    if (existingMember) {
      if (existingMember.status === 'accepted' || !existingMember.status) {
        const err = new Error('User is already a member of this board')
        err.status = 400
        return next(err)
      } else if (existingMember.status === 'pending') {
        const err = new Error('Invitation already sent to this user')
        err.status = 400
        return next(err)
      } else if (existingMember.status === 'declined') {
        existingMember.status = 'pending'
        existingMember.role = req.body.role || 'member'
      }
    } else {
      req.board.members.push({ userId: userToAdd._id, role: req.body.role || 'member', status: 'pending' })
    }

    await req.board.save()
    const updatedBoard = await Board.findById(req.board._id).populate('members.userId', 'name username email avatar')

    // Trigger Notification
    await createNotification({
        recipientId: userToAdd._id,
        senderId: req.user.id,
        type: 'BOARD_INVITE',
        title: 'Board Invitation',
        message: `${req.user.username || 'A team member'} invited you to join board "${req.board.title}"`,
        link: `/`
    })

    res.status(201).json({ message: `Invitation sent to ${username}`, board: updatedBoard })

    } catch(err){
        next(err)
    }
})

//---------------------------------------- Remove Member route ------------------------------------------
// DELETE /api/boards/:boardId/members/:userId
router.delete('/:boardId/members/:userId', authenticate, authorizeBoard, requireOwner, async (req, res, next) => {
    try {
        const { userId } = req.params
        const { createNotification } = require('../utils/notify')

        req.board.members = req.board.members.filter(
            (member) => member.userId.toString() !== userId
        )
        await req.board.save()
        const updatedBoard = await Board.findById(req.board._id).populate('members.userId', 'name username email avatar')

        // Trigger Notification
        await createNotification({
            recipientId: userId,
            senderId: req.user.id,
            type: 'MEMBER_REMOVED',
            title: 'Removed from Board',
            message: `You were removed from board "${req.board.title}"`,
            link: `/`
        })

        res.json({ message: 'Member removed successfully', board: updatedBoard })
    } catch (err) {
        next(err)
    }
})

//---------------------------------------- Leave Board route ------------------------------------------
// POST /api/boards/:boardId/leave
router.post('/:boardId/leave', authenticate, authorizeBoard, async (req, res, next) => {
    try {
        const board = req.board
        const userId = req.user.id
        const { createNotification } = require('../utils/notify')

        // Check if user is owner
        const ownerIdStr = board.ownerId._id ? board.ownerId._id.toString() : board.ownerId.toString()
        if (ownerIdStr === userId) {
            const err = new Error('As the board owner, you cannot leave the board. You can delete the board or transfer ownership.')
            err.status = 400
            return next(err)
        }

        // Remove user from members array
        const initialMemberCount = board.members.length
        board.members = board.members.filter(m => {
            const mId = m.userId._id ? m.userId._id.toString() : m.userId.toString()
            return mId !== userId
        })

        if (board.members.length === initialMemberCount) {
            const err = new Error('You are not a member of this board')
            err.status = 400
            return next(err)
        }

        await board.save()

        // Get all recipient IDs: remaining accepted members + owner
        const recipientIds = new Set()
        recipientIds.add(ownerIdStr)

        board.members.forEach(m => {
            if (m.userId && (m.status === 'accepted' || !m.status)) {
                const idStr = m.userId._id ? m.userId._id.toString() : m.userId.toString()
                if (idStr !== userId) {
                    recipientIds.add(idStr)
                }
            }
        })

        // Notify all remaining members and owner that user left
        const leaverName = req.user.name || req.user.username || 'A member'
        for (const recipientId of recipientIds) {
            if (recipientId !== userId) {
                await createNotification({
                    recipientId,
                    senderId: userId,
                    type: 'GENERAL',
                    title: 'Member Left Board',
                    message: `${leaverName} left board "${board.title}"`,
                    link: `/board/${board._id}`
                })
            }
        }

        res.json({ message: 'Successfully left the board' })
    } catch (err) {
        next(err)
    }
})

//---------------------------------------- Update Member Role route ------------------------------------------
// PATCH /api/boards/:boardId/members/:userId
router.patch('/:boardId/members/:userId', authenticate, authorizeBoard, requireOwner, async (req, res, next) => {
    try {
        const { boardId, userId } = req.params
        const { role } = req.body
        const { createNotification } = require('../utils/notify')

        const updatedBoard = await Board.findOneAndUpdate(
            { _id: boardId, 'members.userId': userId },
            { $set: { 'members.$.role': role || 'member' } },
            { new: true }
        ).populate('members.userId', 'name username email avatar')

        if (!updatedBoard) {
            const err = new Error('Member not found on this board')
            err.status = 404
            return next(err)
        }

        // Trigger Notification
        await createNotification({
            recipientId: userId,
            senderId: req.user.id,
            type: 'ROLE_CHANGE',
            title: 'Role Updated',
            message: `Your role on board "${updatedBoard.title}" was updated to ${role || 'member'}`,
            link: `/board/${updatedBoard._id}`
        })

        return res.json({ message: 'Role updated successfully', board: updatedBoard })
    } catch (err) {
        next(err)
    }
})

module.exports = router 
