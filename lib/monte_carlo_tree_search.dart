import 'package:player2/models/boards/board.dart';
import 'package:player2/models/boards/move.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/tree.dart';
import 'package:player2/models/uct.dart';

class MonteCarloTreeSearch {
  Board board;
  int opponent;
  Duration duration;
  Tree tree;

  MonteCarloTreeSearch(this.board, this.duration) {
    tree = new Tree(board);
  }

  Board findNextMove(int playerNo) {
    opponent = 3 - playerNo;
    Node startNode = tree.rootNode;

    DateTime startTime = DateTime.now();
    DateTime endTime = startTime.add(duration);
    while (DateTime.now().isBefore(endTime)) {
      Node promisingNode = selection(startNode);
      double winCondition = rollOut(promisingNode, playerNo);
    }
  }

  Node selection(Node node) {
    Node node = tree.rootNode;
    bool leafNode = false;
    Node promisingNode = node;
    while (leafNode == false) {
      promisingNode = UCT.selectionFunction(node);
      if (promisingNode.state.sims == 0) {
        leafNode = true;
      }
    }
    return promisingNode;
  }

  void expansion() {}

  double rollOut(Node node, int playerNo) {
    int currentPlayer = playerNo;
    double winCondition = 0;
    // TODO find a way to make this not specific to tic tac toe
    Board board = new TicTacToeBoard.copy(node.state.board);
    while (winCondition == 0) {
      Move move = board.randomMove(currentPlayer);
      board = board.makeMove(move);
      winCondition = board.checkWinCondition();
      if (winCondition == 0) currentPlayer = 3 - currentPlayer;
    }
    return winCondition;
  }

  void backPropagation() {}
}
