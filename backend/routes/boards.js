const express        = require('express')
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

       const board = await Board.create({
        title,
        background: background || 'linear-gradient(135deg, #1E1E24, #2A2A38)',
        ownerId: req.user.id,
        members: [{userId: req.user.id, role: 'owner'}]
       })

        res.status(201).json(board)

    } catch(err){
        next(err)
    }
})

//-------------------------- GET /api/boards ----------------------------------

router.get('/', authenticate, async (req, res,next) => {
    try{
        const boards = await Board.find({
            'members.userId': req.user.id
        }).sort({ updatedAt: -1 })        

        res.json(boards)

    } catch(err){
        next(err)
    }
})

//----------------------------------  Get a single board with its lists and cards ------------------------
// GET /api/boards/:boardId

router.get('/:boardId', authenticate, authorizeBoard, async (req, res,next) => {
    try{
    const List = require('../models/List')
    const Card = require('../models/Card')
    const board = req.board

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
                .populate('assignedMembers', 'username email')
                .sort({position: 1})
            return {...list.toObject(), cards}
        })
    )

    // Populate member details (username & email)
    const populatedBoard = await Board.findById(board._id).populate('members.userId', 'username email')

    res.json({ ...(populatedBoard ? populatedBoard.toObject() : board.toObject()), lists: listWithCards })

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
        )
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

    const alreadyMember = req.board.members.some(
      member => member.userId.toString() === userToAdd._id.toString()
    )

    if (alreadyMember) {
      const err = new Error('User is already a member of this board')
      err.status = 400
      return next(err)
    }

    req.board.members.push({ userId: userToAdd._id, role: req.body.role || 'member' })
    await req.board.save()
    const updatedBoard = await Board.findById(req.board._id).populate('members.userId', 'username email')

    res.status(201).json({ message: `${username} added to the board`, board: updatedBoard })

    } catch(err){
        next(err)
    }
})

//---------------------------------------- Remove Member route ------------------------------------------
// DELETE /api/boards/:boardId/members/:userId
router.delete('/:boardId/members/:userId', authenticate, authorizeBoard, requireOwner, async (req, res, next) => {
    try {
        const { userId } = req.params
        req.board.members = req.board.members.filter(
            (member) => member.userId.toString() !== userId
        )
        await req.board.save()
        const updatedBoard = await Board.findById(req.board._id).populate('members.userId', 'username email')
        res.json({ message: 'Member removed successfully', board: updatedBoard })
    } catch (err) {
        next(err)
    }
})

//---------------------------------------- Update Member Role route ------------------------------------------
// PATCH /api/boards/:boardId/members/:userId
router.patch('/:boardId/members/:userId', authenticate, authorizeBoard, requireOwner, async (req, res, next) => {
    try {
        const { userId } = req.params
        const { role } = req.body
        const memberIndex = req.board.members.findIndex(
            (member) => member.userId.toString() === userId
        )
        if (memberIndex !== -1) {
            req.board.members[memberIndex].role = role || 'member'
            await req.board.save()
            const updatedBoard = await Board.findById(req.board._id).populate('members.userId', 'username email')
            return res.json({ message: 'Role updated successfully', board: updatedBoard })
        }
        res.status(404).json({ error: 'Member not found' })
    } catch (err) {
        next(err)
    }
})

module.exports = router 
