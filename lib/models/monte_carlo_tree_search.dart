import 'package:player2/models/boards/board.dart';
import 'package:player2/models/boards/move.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/tree.dart';
import 'package:player2/models/uct.dart';

class MonteCarloTreeSearch {
  Board board;
  Duration duration;
  Tree tree;
  int _iteration;

  MonteCarloTreeSearch(this.board, this.duration) {
    tree = new Tree(board);
  }
  MonteCarloTreeSearch.iteration(this.board, this._iteration) {
    tree = new Tree(board);
  }

  Board findNextMove() {
    Node startNode = tree.rootNode;

    if (_iteration == null) {
      DateTime endTime = DateTime.now().add(duration);
      while (DateTime.now().isBefore(endTime)) {
        Node promisingNode = selection(startNode);
        if (promisingNode == null) break;
        Node rollOutNode = expansion(promisingNode);
        if (rollOutNode == null) break;
        double winCondition = rollOut(rollOutNode);
        backPropagation(rollOutNode, winCondition);
      }
    } else {
      for (int i = 0; i < _iteration; i++) {
        Node promisingNode = selection(startNode);
        if (promisingNode == null) break;
        Node rollOutNode = expansion(promisingNode);
        if (rollOutNode == null) break;
        double winCondition = rollOut(rollOutNode);
        backPropagation(rollOutNode, winCondition);
      }
    }

    Node winnerNode = startNode.getChildWithMaxScore();
    tree.setRoot(winnerNode);
    return winnerNode.state.board;
  }

  Node selection(Node node) {
    Node promisingNode = node;
    bool isLeafNode = promisingNode.childrenNodes == null;
    while (isLeafNode == false) {
      promisingNode = UCT.selectionFunction(promisingNode);
      if (promisingNode == null) {
        return null;
      }
      if (promisingNode.childrenNodes == null) {
        isLeafNode = true;
      }
    }
    return promisingNode;
  }

  Node expansion(Node node) {
    Node rollOutNode;
    if (node.state.sims == 0) {
      rollOutNode = node;
    } else {
      node.generateChildrenNodes();
      try {
        rollOutNode = node.childrenNodes[0];
      } on RangeError {
        return null;
      }
    }
    return rollOutNode;
  }

  double rollOut(Node node) {
    // TODO find a way to make this not specific to tic tac toe
    Board board = new TicTacToeBoard.copy(node.state.board);
    double winCondition = board.checkWinCondition();
    while (winCondition == 0) {
      Move move = board.randomMove();
      board = board.makeMove(move);
      winCondition = board.checkWinCondition();
    }
    return winCondition;
  }

  void backPropagation(Node node, double winCondition) {
    Node currentNode = node;
    while (currentNode != null) {
      bool nodeWins = node.state.board.playerTurn == winCondition;
      bool nodeDraws = winCondition == 0.5;
      if (nodeWins) {
        node.state.wins += 1;
      } else if (nodeDraws) {
        node.state.wins += 0.5;
      }
      node.state.sims += 1;
      currentNode = currentNode.parent;
    }
  }
}
