import 'package:player2/models/state.dart';

class Node {
  State _state;
  Node _parentNode;
  List<Node> _childrenNodes;

  Node(this._state);
  Node.parent(this._state, this._parentNode);

  State get state => _state;
  Node get parent => _parentNode;
  List<Node> get childrenNodes => _childrenNodes;

  void generateChildrenNodes() {
    _childrenNodes = [];
    List<State> possibleStates = _state.getAllPossibleStates();
    possibleStates.forEach((state) {
      _childrenNodes.add(Node.parent(state, this));
    });
  }

  Node getChildWithMaxScore() {
    Node maxScoreNode = this;
    if (_childrenNodes != null) {
      maxScoreNode = _childrenNodes[0];
      double maxScore = 0;
      _childrenNodes.forEach((node) {
        if (node.state.wins > maxScore) {
          maxScore = node.state.wins;
          maxScoreNode = node;
        }
      });
    }
    return maxScoreNode;
  }
}
