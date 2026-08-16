const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Board = require('../models/Board')
const List = require('../models/List')
const Card = require('../models/Card')
const authenticate = require('../middleware/authenticate')

// GET /api/search?q=query
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { q } = req.query
        if (!q || !q.trim()) {
            return res.json({ boards: [], cards: [] })
        }

        const searchRegex = new RegExp(q.trim(), 'i')
        const userId = req.user.id
        let userObjId
        try {
            userObjId = new mongoose.Types.ObjectId(userId)
        } catch (e) {
            userObjId = userId
        }

        // 1. Find all boards where current user is owner OR member
        const userAccessibleBoards = await Board.find({
            $or: [
                { ownerId: userObjId },
                { ownerId: userId },
                { 'members.userId': userObjId },
                { 'members.userId': userId }
            ]
        }).select('_id title background ownerId members')

        const accessibleBoardIds = userAccessibleBoards.map(b => b._id)

        // 2. Filter matching boards by title
        const boards = userAccessibleBoards.filter(b => searchRegex.test(b.title)).slice(0, 10)

        // 3. Find all lists belonging to accessible boards
        const accessibleLists = await List.find({
            boardId: { $in: accessibleBoardIds }
        }).select('_id boardId title')

        const accessibleListIds = accessibleLists.map(l => l._id)

        // 4. Find matching cards in accessible lists
        const matchingCards = await Card.find({
            listId: { $in: accessibleListIds },
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ]
        })
        .populate({
            path: 'listId',
            select: 'title boardId',
            populate: {
                path: 'boardId',
                select: 'title background'
            }
        })
        .select('title description listId labels dueDate')
        .limit(15)

        // Format cards with board info
        const formattedCards = matchingCards.map(c => {
            const listObj = c.listId || {}
            const boardObj = listObj.boardId || {}
            return {
                _id: c._id,
                title: c.title,
                description: c.description,
                listId: listObj._id || c.listId,
                listTitle: listObj.title || '',
                boardId: boardObj._id || listObj.boardId || null,
                boardTitle: boardObj.title || 'Board',
                boardBackground: boardObj.background || ''
            }
        })

        res.json({ boards, cards: formattedCards })
    } catch (err) {
        next(err)
    }
})

module.exports = router
