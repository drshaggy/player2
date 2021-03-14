import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/state.dart';
import 'package:player2/models/uct.dart';

void main() {
  group('UctTest -', () {
    group('uctValue() -', () {
      test('Returns infinity is si is 0', () {
        TicTacToeBoard board = new TicTacToeBoard();
        State state = new State(board);
        Node parentNode = new Node(state);
        board = new TicTacToeBoard.position("100000000");
        state = new State(board);
        Node childNode = new Node(state);
        double val = UCT.uctValue(parentNode, childNode);
        expect(val, double.infinity);
      });
    });
  });
}
