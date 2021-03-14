import 'dart:math';

import 'package:player2/models/node.dart';

class UCT {
  static double uctValue(Node parentNode, Node childNode) {
    // * uctValue = (wi / si) + c sqrt(ln(sp)/si)
    // * where wi = child node simulation wins, si = child node number of sims,
    // * sp = parent nodes number of sims, c = exploration param (typically sqrt(2))

    double wi = childNode.state.wins;
    int si = childNode.state.sims;
    int sp = parentNode.state.sims;
    double c = sqrt(2);

    return si == 0 ? double.infinity : (wi / si) + c * sqrt(log(sp) / si);
  }

  static Node selectionFunction(Node parentNode) {
    Node promisingNode;
    double highestUctValue = 0;
    int simsParent = parentNode.state.sims;
    List<Node> childrenNodes = parentNode.getChildrenNodes();
    childrenNodes.forEach((childNode) {
      double uctVal = uctValue(parentNode, childNode);
      if (uctVal > highestUctValue) {
        highestUctValue = uctVal;
        promisingNode = childNode;
      }
      if (uctVal == double.infinity) return promisingNode;
    });
    return promisingNode;
  }
}
