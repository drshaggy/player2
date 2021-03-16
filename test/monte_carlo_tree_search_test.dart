import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/move.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/boards/tic_tac_toe_move.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/monte_carlo_tree_search.dart';
import 'package:player2/models/state.dart';

void main() {
  group('MonteCarloTreeSearchTest -', () {
    group('selection() -', () {
      test('Selected node should be root node', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        Node node = MonteCarloTreeSearch.selection(mcts.tree.rootNode);

        expect(node, mcts.tree.rootNode);
      });

      test('First child node selected from root node', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        Node node = MonteCarloTreeSearch.selection(mcts.tree.rootNode);
        expect(node.state.board.position, "000000000");
      });
    });
    group('expansion() -', () {
      test('Check after expansion there are 8 unexpanded nodes', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = MonteCarloTreeSearch.rollOut(mcts.tree.rootNode);
        MonteCarloTreeSearch.backPropagation(mcts.tree.rootNode, winCondition);
        MonteCarloTreeSearch.expansion(mcts.tree.rootNode);
        expect(mcts.tree.rootNode.getUnexploredNodes().length, 8);
      });
      test('Check after expansion there is 1 child node', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = MonteCarloTreeSearch.rollOut(mcts.tree.rootNode);
        MonteCarloTreeSearch.backPropagation(mcts.tree.rootNode, winCondition);
        MonteCarloTreeSearch.expansion(mcts.tree.rootNode);

        expect(mcts.tree.rootNode.getChildrenNodes().length, 1);
      });
      test('Check after 2nd expansion there are 2 children nodes', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = MonteCarloTreeSearch.rollOut(mcts.tree.rootNode);
        MonteCarloTreeSearch.backPropagation(mcts.tree.rootNode, winCondition);
        MonteCarloTreeSearch.expansion(mcts.tree.rootNode);
        MonteCarloTreeSearch.expansion(mcts.tree.rootNode);

        expect(mcts.tree.rootNode.getChildrenNodes().length, 2);
      });
      test('Check after 2nd expansion there are 7 unexplored nodes', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = MonteCarloTreeSearch.rollOut(mcts.tree.rootNode);
        MonteCarloTreeSearch.backPropagation(mcts.tree.rootNode, winCondition);
        MonteCarloTreeSearch.expansion(mcts.tree.rootNode);
        MonteCarloTreeSearch.expansion(mcts.tree.rootNode);

        expect(mcts.tree.rootNode.getUnexploredNodes().length, 7);
      });
    });
    group('rollOut() -', () {
      test('Gets a win Condition from game played to end from start position',
          () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = MonteCarloTreeSearch.rollOut(mcts.tree.rootNode);
        bool success = false;
        if (winCondition == 0.5 || winCondition == 1 || winCondition == 2) {
          success = true;
        }
        expect(success, true, reason: "Result is $winCondition");
      });
      test(
          'Gets a win Condition from game played to end from player 2s first go ',
          () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard.position("100000000");
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = MonteCarloTreeSearch.rollOut(mcts.tree.rootNode);
        bool success = false;
        if (winCondition == 0.5 || winCondition == 1 || winCondition == 2) {
          success = true;
        }
        expect(success, true, reason: "Result is $winCondition");
      });
      test('From winning position for player 1', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard.position("111220000");
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = MonteCarloTreeSearch.rollOut(mcts.tree.rootNode);
        expect(winCondition, 1);
      });
      test('From winning position for player 2', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard.position("110222110");
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = MonteCarloTreeSearch.rollOut(mcts.tree.rootNode);
        expect(winCondition, 2);
      });
    });
    group('backPropagation() -', () {
      test('Tests if parents stats get update properly in propagation', () {
        TicTacToeBoard board = TicTacToeBoard.position("000000000");
        MonteCarloTreeSearch mcts =
            MonteCarloTreeSearch(board, Duration(seconds: 1));
        State state = State.test(board, wins: 1, sims: 3);
        Node node = Node(state);

        TicTacToeMove move = TicTacToeMove(1, 0);
        board.makeMove(move);
        state = State.test(board, wins: 2, sims: 2);
        node.addChildNode(Node(state));
        node = node.getChildrenNodes()[0];

        move = TicTacToeMove(2, 1);
        board.makeMove(move);
        state = State.test(board, wins: 2, sims: 2);
        node.addChildNode(Node(state));
        node = node.getChildrenNodes()[0];

        move = TicTacToeMove(1, 4);
        board.makeMove(move);
        state = State.test(board, wins: 0, sims: 1);
        node.addChildNode(Node(state));
        node = node.getChildrenNodes()[0];

        move = TicTacToeMove(2, 8);
        board.makeMove(move);
        state = State.test(board);
        node.addChildNode(Node(state));
        node = node.getChildrenNodes()[0];

        double winCondition = 2;
        MonteCarloTreeSearch.backPropagation(node, winCondition);

        expect(node.state.sims, 1);
        expect(node.state.wins, 0);
        node = node.parentNode;
        expect(node.state.sims, 2);
        expect(node.state.wins, 1);
      });
    });
    group('findNextMove() -', () {
      test('Testing findNextMove returns a new board with one move', () async {
        Duration duration = new Duration(seconds: 1);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);

        Move move = await mcts.findNextMove(debug: true);
        expect(move != null, true);
      });
      test(
          'Testing findNextMove returns a new board with one move with duration of 10 seconds',
          () async {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);

        Move move = await mcts.findNextMove(debug: true);
        expect(move != null, true);
      });
      test(
          'Testing findNextMove on iteration mode with 1 iteration returns a new board with one move',
          () async {
        int iter = 1;
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts =
            new MonteCarloTreeSearch.iteration(board, iter);

        Move move = await mcts.findNextMove(debug: true);
        expect(move != null, true);
      });
      test(
          'Testing findNextMove on iteration mode with 10 iterations returns a new board with one move',
          () async {
        int iter = 10;
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts =
            new MonteCarloTreeSearch.iteration(board, iter);

        Move move = await mcts.findNextMove(debug: true);
        expect(move != null, true);
      });
      test(
          'Testing findNextMove on iteration mode with 20 iterations returns a new board with one move',
          () async {
        int iter = 20;
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts =
            new MonteCarloTreeSearch.iteration(board, iter);

        Move move = await mcts.findNextMove(debug: true);
        expect(move != null, true);
      });
    });
  });
}
