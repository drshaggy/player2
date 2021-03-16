import 'dart:math';

import 'package:player2/models/node.dart';

class UCT {
  static double uctValue(double noOfWins, int noOfSims, int noOfParentSims,
      {double explorationParameter = sqrt2}) {
    // * uctValue = (wi / si) + c sqrt(ln(sp)/si)
    // * where wi = child node simulation wins, si = child node number of sims,
    // * sp = parent nodes number of sims, c = exploration param (typically sqrt(2))

    return noOfSims == 0
        ? double.infinity
        : (noOfWins / noOfSims) +
            explorationParameter * sqrt(log(noOfParentSims) / noOfSims);
  }

  static Node selectionFunction(Node parentNode) {
    Node promisingNode;
    double highestUctValue = 0;
    List<Node> childrenNodes = parentNode.getChildrenNodes();
    int sp = parentNode.state.sims;
    childrenNodes.forEach((childNode) {
      double wi = childNode.state.wins;
      int si = childNode.state.sims;
      double uctVal = uctValue(wi, si, sp);
      if (uctVal > highestUctValue) {
        highestUctValue = uctVal;
        promisingNode = childNode;
      }
      if (uctVal == double.infinity) return promisingNode;
    });
    return promisingNode;
  }
}
