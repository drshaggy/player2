import 'dart:math';

import 'package:player2/enums/best_move_type.dart';
import 'package:player2/models/state.dart';

class Node {
  State _state;
  Node _parentNode;
  List<Node> _childrenNodes = [];
  List<Node> _unexploredNodes;

  Node(this._state);
  Node.parent(this._state, this._parentNode);

  State get state => _state;
  Node get parentNode => _parentNode;
  // List<Node> get childrenNodes => _childrenNodes;
  // List<Node> get unexploredNodes => _unexploredNodes;

  void generateUnexploredNodes() {
    _unexploredNodes = [];
    List<State> possibleStates = _state.getAllPossibleStates();
    possibleStates.forEach((state) {
      _unexploredNodes.add(Node.parent(state, this));
    });
  }

  Node popRandomUnexploredNode() {
    Random random = new Random();
    int randomNumber = random.nextInt(_unexploredNodes.length);
    return _unexploredNodes.removeAt(randomNumber);
  }

  Node getChildWithBestMove(BestMoveType bestMoveType) {
    Node bestNode;
    double maxScore = double.negativeInfinity;

    _childrenNodes.forEach((node) {
      double condition;
      switch (bestMoveType) {
        case BestMoveType.max:
          condition = node.state.sims.toDouble();
          break;
        case BestMoveType.robust:
          condition = node.state.wins / node.state.sims;
      }
      if (condition > maxScore) {
        maxScore = node.state.wins;
        bestNode = node;
      }
    });

    return bestNode;
  }

  bool isLeaf() {
    return _childrenNodes.isEmpty;
  }

  bool isNotLeaf() {
    return _childrenNodes.isNotEmpty;
  }

  bool isFullyExplored() {
    return _unexploredNodes.isEmpty;
  }

  List<Node> getChildrenNodes() {
    return _childrenNodes;
  }

  List<Node> getUnexploredNodes() {
    return _unexploredNodes;
  }

  void addChildNode(Node node) {
    node._parentNode = this;
    _childrenNodes.add(node);
  }
}
