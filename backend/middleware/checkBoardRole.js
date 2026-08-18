const Board = require('../models/Board')
const List = require('../models/List')
const Card = require('../models/Card')
const Comment = require('../models/Comment')

/**
 * Middleware factory to authorize board roles.
 * @param {Array<string>} allowedRoles - Allowed roles, e.g. ['owner', 'member']
 */
function authorizeBoardRole(allowedRoles = ['owner', 'member']) {
  return async (req, res, next) => {
    try {
      const userId = req.user.id
      let boardId = req.params.boardId

      // If boardId is not directly in req.params, derive it from listId, cardId, or commentId
      if (!boardId && req.params.listId) {
        const list = await List.findById(req.params.listId)
        if (list) boardId = list.boardId
      } else if (!boardId && req.params.cardId) {
        const card = await Card.findById(req.params.cardId)
        if (card) {
          const list = await List.findById(card.listId)
          if (list) boardId = list.boardId
        }
      } else if (!boardId && req.params.commentId) {
        const comment = await Comment.findById(req.params.commentId)
        if (comment) {
          const card = await Card.findById(comment.cardId)
          if (card) {
            const list = await List.findById(card.listId)
            if (list) boardId = list.boardId
          }
        }
      }

      if (!boardId) {
        const err = new Error('Board context not found')
        err.status = 404
        return next(err)
      }

      const board = await Board.findById(boardId)
      if (!board) {
        const err = new Error('Board not found')
        err.status = 404
        return next(err)
      }

      // Board owner always has full access
      if (board.ownerId.toString() === userId.toString()) {
        req.board = board
        req.userRole = 'owner'
        return next()
      }

      // Find user role in board members
      const memberEntry = board.members.find(m => m.userId.toString() === userId.toString())
      const userRole = memberEntry ? memberEntry.role : null

      if (!userRole || !allowedRoles.includes(userRole)) {
        const err = new Error('Access denied: Viewers have read-only permissions on this board.')
        err.status = 403
        return next(err)
      }

      req.board = board
      req.userRole = userRole
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = authorizeBoardRole
