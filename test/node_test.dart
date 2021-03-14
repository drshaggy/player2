import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/state.dart';

void main() {
  group('NodeTest -', () {
    group('getChildrenNodes() -', () {
      test('Test that a starting state returns 9 children nodes', () {
        TicTacToeBoard board = new TicTacToeBoard();
        Node node = new Node(State(board));
        node.generateChildrenNodes();
        List<Node> childrenNodes = node.childrenNodes;

        expect(childrenNodes.length, 9);
      });
      test('Check the children nodes have correct parent node', () {
        TicTacToeBoard board = new TicTacToeBoard();
        Node node = new Node(State(board));
        node.generateChildrenNodes();
        node.childrenNodes.forEach((childNode) {
          expect(childNode.parent, node);
        });
      });
      test('Check the parent node has children with children nodes', () {
        TicTacToeBoard board = new TicTacToeBoard();
        Node node = new Node(State(board));
        node.generateChildrenNodes();
        List<Node> childrenNodes = node.childrenNodes;
        childrenNodes[0].generateChildrenNodes();

        expect(node.childrenNodes[0].childrenNodes, isNot(null));
      });
    });
  });
}
