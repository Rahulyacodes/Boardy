const Board = require("../models/Board");
const List = require("../models/List");
const Card = require("../models/Card");

async function authorizeBoard(req, res, next) {
  try {
    // get the boardId from the url
    const boardId = req.params.boardId;
    const board = await Board.findById(boardId);

    if (!board) {
      const err = new Error("Board not found");
      err.status = 404;
      return next(err);
    }

    // check if logged in member user is member of this board
    // members are now embedded inside the board document

    const isMember = board.members.some(
      (member) => member.userId.toString() === req.user.id && (member.status === 'accepted' || !member.status),
    );
    // .some() goes through each one and returns true if ANY of them match both conditions

    if (!isMember) {
      const err = new Error("You are not member of this board");
      err.status = 403;
      return next(err);
    }

    // 4. user is a member — attach board to req and move on
    req.board = board;
    next();
  } catch (err) {
    next(err);
  }
}

// ------------------------------- Authorize middleware for lists ------------------------------

async function authorizeList(req, res, next) {
try{
  // find the list
  const listId = req.params.listId;
  const list = await List.findById(listId)

  if (!list) {
    const err = new Error("List not found");
    err.status = 404;
    return next(err);
  }

  // find the board lists belong to
  const board = await Board.findById(list.boardId)                     

  // check if logged in user is member of board or not
  const isMember = board.members.some(
    member => member.userId.toString() === req.user.id && (member.status === 'accepted' || !member.status)
  )

  if (!isMember) {
    const err = new Error("You are not a member of this board");
    err.status = 403;
    return next(err);
  }

  // attach both list and board to req
  req.list = list;
  req.board = board;
  next();

} catch(err){
    next(err)
    }
}

// ---------------------------------------- Authorized cards ------------------------------------------

async function authorizeCard(req, res, next) {

    try{
  // find the card
  const cardId = req.params.cardId;
  const card = await Card.findById(cardId)

  if (!card) {
    const err = new Error("Card not found");
    err.status = 404;
    return next(err);
  }

  // trace up - find the list and board this card belongs to
  const list = await List.findById(card.listId)
  const board = await Board.findById(list.boardId)

  // check membership
  const isMember = board.members.some(
    member => member.userId.toString() === req.user.id && (member.status === 'accepted' || !member.status)
  )

  if (!isMember) {
    const err = new Error("You are not member of this board");
    err.status = 403;
    return next(err);
  }

  // attach everything to req
  req.card = card;
  req.list = list;
  req.board = board;
  next();

    }catch(err){
        next(err)
    }
}

// ---------------------------- check only owner routes -----------------------------------------
function requireOwner(req, res, next) {
  // this runs AFTER authorizeBoard, so req.board and req.user already exist

  const membership = req.board.members.find(
    member => member.userId.toString() === req.user.id
  )

  if (membership.role !== "owner") {
    const err = new Error("Only the board owner can add members");
    err.status = 403;
    return next(err);
  }
  next();
}

module.exports = { authorizeBoard, authorizeList, authorizeCard, requireOwner };
