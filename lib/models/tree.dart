import 'package:player2/models/boards/board.dart';
import 'package:player2/models/node.dart';
import 'package:player2/models/state.dart';

class Tree {
  Node rootNode;

  Tree(Board board) {
    rootNode = Node(State(board));
  }

  void setRoot(Node node) {
    State state = new State(node.state.board);
    rootNode = Node(state);
  }
}
