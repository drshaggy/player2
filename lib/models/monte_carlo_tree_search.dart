import 'package:player2/enums/best_move_type.dart';
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

  Future<Move> findNextMove({bool debug = false}) async {
    Node startNode = tree.rootNode;
    Node node;
    int simulations = 0;

    if (_iteration == null) {
      DateTime endTime = DateTime.now().add(duration);
      while (DateTime.now().isBefore(endTime)) {
        simulations++;
        node = findMoveLoop(startNode, debug: debug);
      }
    } else {
      for (int i = 0; i < _iteration; i++) {
        simulations++;
        node = findMoveLoop(startNode, debug: debug);
      }
    }
    Node winnerNode = nodeWithBestMove(startNode);
    tree.setRoot(winnerNode);
    if (debug) print("findNextMove complete");
    print("simulations: $simulations");
    return winnerNode.state.board.getLastMove();
  }

  Node findMoveLoop(Node startNode, {bool debug = false, int iteration}) {
    if (debug) print(iteration);
    Node promisingNode = selection(startNode);
    double winCondition = promisingNode.state.board.checkWinCondition();

    if (winCondition == 0) {
      promisingNode = expansion(promisingNode);
      winCondition = rollOut(promisingNode);
    }
    backPropagation(promisingNode, winCondition);

    return promisingNode;
  }

  Node nodeWithBestMove(Node node,
      {BestMoveType bestMoveType = BestMoveType.robust}) {
    if (node.isFullyExplored() == false)
      throw Exception("Not enough information to make a decision on a move");
    return node.getChildWithBestMove(bestMoveType);
  }

  static Node selection(Node node) {
    if (node.getUnexploredNodes() == null) {
      node.generateUnexploredNodes();
    }
    while (node.isNotLeaf() && node.isFullyExplored()) {
      node = UCT.selectionFunction(node);
    }
    return node;
  }

  static Node expansion(Node node) {
    if (node.getUnexploredNodes() == null) {
      node.generateUnexploredNodes();
    }
    if (node.state.sims == 0) {
      return node;
    } else {
      Node expandedNode = node.popRandomUnexploredNode();
      node.addChildNode(expandedNode);
      return expandedNode;
    }
  }

  static double rollOut(Node node) {
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

  static void backPropagation(Node node, double winCondition) {
    while (node != null) {
      bool nodeWins = node.state.board.playerTurn == winCondition;
      bool nodeDraws = winCondition == 0.5;
      node.state.sims = node.state.sims + 1;
      // * The win condition is flipped due to the fact that each node’s
      // * statistics are used for its parent node’s choice, not its own.
      if (nodeWins && nodeDraws == false) {
        node.state.wins = node.state.wins + 1;
      }
      if (nodeDraws) {
        node.state.wins = node.state.wins + 0.5;
      }
      node = node.parentNode;
    }
  }
}
