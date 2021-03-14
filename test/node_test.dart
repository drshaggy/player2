import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/state.dart';

void main() {
  group('NodeTest -', () {
    group('getChildrenNodes() -', () {
      test('Test that a starting state returns 9 children nodes', () {
        TicTacToeBoard board = new TicTacToeBoard();
        Node node = new Node(State(board, 1));

        List<Node> childrenNodes = node.getChildrenNodes();

        expect(childrenNodes.length, 9);
      });
    });
  });
}
