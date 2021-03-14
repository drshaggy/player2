import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/monte_carlo_tree_search.dart';

void main() {
  group('MonteCarloTreeSearchTest -', () {
    group('selection() -', () {
      test('Childs parent node should equal root node', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        Node node = mcts.selection(mcts.tree.rootNode);
        expect(node.parent, mcts.tree.rootNode);
      });

      test('First child node selected from root node', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        Node node = mcts.selection(mcts.tree.rootNode);
        expect(node.state.board.position, "100000000");
      });
    });
    group('rollOut() -', () {
      test('Gets a win Condition from game played to end', () {
        Duration duration = new Duration(seconds: 10);
        TicTacToeBoard board = new TicTacToeBoard();
        MonteCarloTreeSearch mcts = new MonteCarloTreeSearch(board, duration);
        Node node = mcts.selection(mcts.tree.rootNode);
        double winCondition = mcts.rollOut(node, 2);
        bool success = false;
        if (winCondition == 0.5 || winCondition == 1 || winCondition == 2) {
          success = true;
        }
        expect(success, true, reason: "Result is $winCondition");
      });
    });
  });
}
