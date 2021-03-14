import 'package:player2/models/state.dart';

class Node {
  State _state;
  Node _parentNode;
  List<Node> _childrenNodes;

  Node(this._state);
  Node.parent(this._state, this._parentNode);

  State get state => _state;
  Node get parent => _parentNode;

  List<Node> getChildrenNodes() {
    _childrenNodes = [];
    List<State> possibleStates = _state.getAllPossibleStates();
    possibleStates.forEach((state) {
      _childrenNodes.add(Node.parent(state, this));
    });
    return _childrenNodes;
  }
}
