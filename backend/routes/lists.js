const express        = require('express')
const List           = require('../models/List')
const Card           = require('../models/Card')
const authenticate   = require('../middleware/authenticate')
const { authorizeBoard, authorizeList } = require('../middleware/authorize')
const authorizeBoardRole = require('../middleware/checkBoardRole')


const router = express.Router()

// ------------ route 1 : create lists----------------------------
// POST /api/boards/:boardId/lists

router.post('/:boardId/lists', authenticate, authorizeBoard, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
    try{
 
        const {title} = req.body
        const boardId = req.params.boardId

        if(!title || !title.trim()){
            const err = new Error("Title is required")
            err.status = 400
            return next(err)
        }

        const cleanTitle = title.trim()

        // Check if a list with the same title already exists in this board
        const existingList = await List.findOne({
            boardId,
            title: { $regex: new RegExp(`^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        })

        if (existingList) {
            const err = new Error(`A list named "${cleanTitle}" already exists in this board.`)
            err.status = 400
            return next(err)
        }

        // find out the position of the lists
        const boardLists = await List.find({ boardId })
        const lastPosition = boardLists.length > 0 
        ? Math.max(...boardLists.map(l => l.position)) : 0;
        const newPosition = lastPosition + 1

        // create the list 
        const list = await List.create({
            title: cleanTitle,
            position : newPosition,
            boardId
        })

        res.status(201).json(list)

    }
     catch(err){
        next(err)
     }
})

// ---------------- update list route (rename & reorder position) -------------------------
// PATCH /api/lists/:listId

router.patch('/:listId', authenticate, authorizeList, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
    try {
        const { title, position } = req.body
        const updates = {}

        if (title !== undefined && title.trim() !== '') {
            const cleanTitle = title.trim()
            if (cleanTitle !== req.list.title) {
                const existingList = await List.findOne({
                    _id: { $ne: req.list._id },
                    boardId: req.list.boardId,
                    title: { $regex: new RegExp(`^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                })
                if (existingList) {
                    const err = new Error(`A list named "${cleanTitle}" already exists in this board.`)
                    err.status = 400
                    return next(err)
                }
                updates.title = cleanTitle
            }
        }

        if (position !== undefined && !isNaN(Number(position))) {
            updates.position = Math.max(1, Number(position))
        }

        const updatedList = await List.findByIdAndUpdate(
            req.list._id,
            updates,
            { new: true }
        )

        // Re-normalize list positions in the board sequentially if position was changed
        if (position !== undefined) {
            const allLists = await List.find({ boardId: req.list.boardId }).sort({ position: 1, updatedAt: -1 })
            for (let i = 0; i < allLists.length; i++) {
                if (allLists[i].position !== i + 1) {
                    allLists[i].position = i + 1
                    await allLists[i].save()
                }
            }
        }

        res.json(updatedList)

    } catch (err) {
        next(err)
    }   
})

// -------------------------- Delete a list ----------------------------
// DELETE /api/lists/:listId

router.delete('/:listId', authenticate, authorizeList, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
    try{

        const listId = req.list._id

        // delete all cards that belongs to this list first
        await Card.deleteMany({ listId })

        // now delete the list itself
        await List.findByIdAndDelete(listId)

        res.json({message : 'List deleted'})

    } catch(err){
        next(err)
    }
})

module.exports = router
