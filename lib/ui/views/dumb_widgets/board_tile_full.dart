import 'package:flutter/material.dart';

class BoardTileFull extends StatelessWidget {
  final int playerNo;
  final TextStyle style = new TextStyle(fontSize: 75, color: Colors.black);

  BoardTileFull(this.playerNo);

  @override
  Widget build(BuildContext context) {
    String playerPiece;
    if (playerNo == 1) {
      playerPiece = "X";
    } else {
      playerPiece = "O";
    }

    return Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: Colors.black,
            width: 1,
          ),
        ),
        width: 100,
        height: 100,
        child: Center(
            child: Text(
          playerPiece,
          style: style,
        )));
  }
}
