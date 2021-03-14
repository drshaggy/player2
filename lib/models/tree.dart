import 'package:player2/models/boards/board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/state.dart';

class Tree {
  Node rootNode;

  Tree(Board board) {
    rootNode = Node(State(board, 1));
  }
}
