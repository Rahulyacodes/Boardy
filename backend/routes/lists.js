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

        if(!title){
            const err = new Error("Title is required")
            err.status = 400
            return next(err)
        }

        // fint out the position of the lists
        const boardLists = await List.find({ boardId })
        const lastPosition = boardLists.length > 0 
        ? Math.max(...boardLists.map(l => l.position)) : 0;
        const newPosition = lastPosition + 1

        // create the list 
        const list = await List.create({
            title,
            position : newPosition,
            boardId
        })

        res.status(201).json(list)

    }
     catch(err){
        next(err)
     }
})

// ---------------- rename list route -------------------------
// PATCH /api/lists/:listId

router.patch('/:listId', authenticate, authorizeList, authorizeBoardRole(['owner', 'member']), async (req, res, next) => {
    try{

        const {title} = req.body

        if(!title){
            const err = new Error('Title is required')
            err.status = 400
            return next(err)
        }

    // req.list is already attached by authorizedList middleware
    const list = await List.findByIdAndUpdate(
        req.list._id,
        { title },
        { new: true }
    )

    res.json(list)

    } catch(err){
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
