import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/board.dart';
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
    group('findNextMove() -', () {
      test('Testing findNextMove returns a new board with one move', () {
        Duration duration = new Duration(seconds: 1);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);

        Board newBoard = mcts.findNextMove();
        expect(newBoard != null, true);
      });
      test(
          'Testing findNextMove returns a new board with one move with duration of 10 seconds',
          () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);

        Board newBoard = mcts.findNextMove();
        expect(newBoard != null, true);
      });
      test(
          'Testing findNextMove on iteration mode with 1 iteration returns a new board with one move',
          () {
        int iter = 1;
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts =
            new MonteCarloTreeSearch.iteration(board, iter);

        Board newBoard = mcts.findNextMove();
        expect(newBoard != null, true);
      });
      test(
          'Testing findNextMove on iteration mode with 10 iterations returns a new board with one move',
          () {
        int iter = 10;
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts =
            new MonteCarloTreeSearch.iteration(board, iter);

        Board newBoard = mcts.findNextMove();
        expect(newBoard != null, true);
      });
      test(
          'Testing findNextMove on iteration mode with 100 iterations returns a new board with one move',
          () {
        int iter = 100;
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts =
            new MonteCarloTreeSearch.iteration(board, iter);

        Board newBoard = mcts.findNextMove();
        expect(newBoard != null, true);
      });
    });
  });
}
