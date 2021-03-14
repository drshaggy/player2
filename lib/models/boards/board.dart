import 'package:player2/models/boards/move.dart';

abstract class Board {
  String position;

  Board();

  Board.copy(Board board) {
    position = board.position;
  }

  List<Move> legalMoves(int playerNo);

  Board makeMove(Move move);

  Move randomMove(int playerNo);

  double checkWinCondition();
}
