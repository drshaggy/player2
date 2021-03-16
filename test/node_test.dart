import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/state.dart';

void main() {
  group('NodeTest -', () {
    group('generateUnexploredNodesNodes() -', () {
      test('Test that a starting state returns 9 unexplored nodes', () {
        TicTacToeBoard board = new TicTacToeBoard();
        Node node = new Node(State(board));
        node.generateUnexploredNodes();
        expect(node.getUnexploredNodes().length, 9);
      });
      test('Check the children nodes have correct parent node', () {
        TicTacToeBoard board = new TicTacToeBoard();
        Node node = new Node(State(board));
        node.generateUnexploredNodes();
        node.getUnexploredNodes().forEach((unexploredNode) {
          expect(unexploredNode.parentNode, node);
        });
      });
      test('Check the parent node has children with children nodes', () {
        TicTacToeBoard board = new TicTacToeBoard();
        Node node = new Node(State(board));
        node.generateUnexploredNodes();
        node.getChildrenNodes().add(node.popRandomUnexploredNode());
        node.getChildrenNodes()[0].generateUnexploredNodes();
        expect(node.getChildrenNodes()[0].getUnexploredNodes(), isNot([]));
      });
    });
    group('isLeaf() -', () {
      test('Check if isLeaf() returns true when node is terminal', () {
        Node node = Node(State(TicTacToeBoard()));
        node.generateUnexploredNodes();
        expect(node.isLeaf(), true);
      });
      test('Check if isLeaf() returns false when node is not terminal', () {
        Node node = Node(State(TicTacToeBoard()));
        node.generateUnexploredNodes();
        node.addChildNode(node.popRandomUnexploredNode());
        expect(node.isLeaf(), false);
      });
    });
    group('isNotLeaf() -', () {
      test('Check if isNotLeaf() returns false when node is terminal', () {
        Node node = Node(State(TicTacToeBoard()));
        node.generateUnexploredNodes();
        expect(node.isNotLeaf(), false);
      });
      test('Check if isNotLeaf() returns true when node is not terminal', () {
        Node node = Node(State(TicTacToeBoard()));
        node.generateUnexploredNodes();
        node.addChildNode(node.popRandomUnexploredNode());
        expect(node.isNotLeaf(), true);
      });
    });
  });
}
