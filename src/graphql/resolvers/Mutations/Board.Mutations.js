const BoardModel = require("../../../models/boardSchema");
const CardModel = require("../../../models/cardShema");
const ListModel = require("../../../models/listSchema");
const sendNotification = require("../Service/sendNotification");
const auth = require("../authorization");

class BoardMutations {
  static createBoard = async (args, context) => {
    const user = await auth(context.token);
    const board = new BoardModel({
      title: args.title,
      isPublic: args.isPublic,
      lists: [],
      createdAt: new Date().toISOString(),
      users: [user.uid],
      color: args.color ?? "168CD5",
      ownerUser: user.uid,
      updatedAt: new Date().toISOString(),
      status: "Active",
    });
    board.save().catch((err) => {
      throw new Error(err);
    });
    return board;
  };

  static getBoards = async (args, context) => {
    const user = await auth(context.token);
    const boards = await BoardModel.find({
      $or: [{ ownerUser: user.uid }, { users: user.uid }],
      status: "Active",
    });
    // hãy sắp xếp lại boards theo thứ tự theo thời gian tạo mới nhất xuống cũ nhất
    boards.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return boards;
  };
  static leaveBoard = async (args, context) => {
    try {
      const user = await auth(context.token);
      const uid = user.uid;
      const idBoard = args.idBoard;
      const board = await BoardModel.findOne({ _id: idBoard });
      if (board.users != 0) {
        await BoardModel.updateOne({ _id: idBoard }, { $pull: { users: uid } });
      }
      if (board.lists.length == 0) return true;

      const lists = await ListModel.find({ _id: { $in: board.lists } });

      let allListIdCards = [];

      for (const list of lists) {
        if (list.cards && list.cards.length > 0) {
          allListIdCards = allListIdCards.concat(list.cards);
        }
      }

      if (allListIdCards.length == 0) return true;
      await CardModel.updateMany(
        { list: { $in: allListIdCards } },
        { $pull: { users: uid } }
      );
      sendNotification(
        idBoard,
        uid,
        `${user.fullName} đã rời khỏi bảng "${board.title}"`,
        "Board",
        idBoard,
        "Board"
      );

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };
}

module.exports = BoardMutations;
