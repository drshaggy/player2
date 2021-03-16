import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/board.dart';
import 'package:player2/models/boards/move.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/monte_carlo_tree_search.dart';

void main() {
  group('MonteCarloTreeSearchTest -', () {
    group('selection() -', () {
      test('Selected node should be root node', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        Node node = mcts.selection(mcts.tree.rootNode);

        expect(node, mcts.tree.rootNode);
      });

      test('First child node selected from root node', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        Node node = mcts.selection(mcts.tree.rootNode);
        expect(node.state.board.position, "000000000");
      });
    });
    group('expansion() -', () {
      test('Check after expansion there are 8 unexpanded nodes', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = mcts.rollOut(mcts.tree.rootNode);
        mcts.backPropagation(mcts.tree.rootNode, winCondition);
        mcts.expansion(mcts.tree.rootNode);
        expect(mcts.tree.rootNode.unexploredNodes.length, 8);
      });
      test('Check after expansion there is 1 child node', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = mcts.rollOut(mcts.tree.rootNode);
        mcts.backPropagation(mcts.tree.rootNode, winCondition);
        mcts.expansion(mcts.tree.rootNode);

        expect(mcts.tree.rootNode.childrenNodes.length, 1);
      });
      test('Check after 2nd expansion there are 2 children nodes', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = mcts.rollOut(mcts.tree.rootNode);
        mcts.backPropagation(mcts.tree.rootNode, winCondition);
        mcts.expansion(mcts.tree.rootNode);
        mcts.expansion(mcts.tree.rootNode);

        expect(mcts.tree.rootNode.childrenNodes.length, 2);
      });
      test('Check after 2nd expansion there are 7 unexplored nodes', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = mcts.rollOut(mcts.tree.rootNode);
        mcts.backPropagation(mcts.tree.rootNode, winCondition);
        mcts.expansion(mcts.tree.rootNode);
        mcts.expansion(mcts.tree.rootNode);

        expect(mcts.tree.rootNode.unexploredNodes.length, 7);
      });
    });
    group('rollOut() -', () {
      test('Gets a win Condition from game played to end from start position',
          () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = mcts.rollOut(mcts.tree.rootNode);
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
        double winCondition = mcts.rollOut(mcts.tree.rootNode);
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
        double winCondition = mcts.rollOut(mcts.tree.rootNode);
        expect(winCondition, 1);
      });
      test('From winning position for player 2', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard.position("110222110");
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        double winCondition = mcts.rollOut(mcts.tree.rootNode);
        expect(winCondition, 2);
      });
    });
    group('backPropagation() -', () {});
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
