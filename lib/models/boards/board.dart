import 'package:player2/models/boards/move.dart';

abstract class Board {
  String position;
  List<Move> moves = [];
  int playerTurn;

  Board();

  Board.copy(Board board) {
    position = board.position;
    playerTurn = board.playerTurn;
    moves = board.moves;
  }

  List<Move> legalMoves();

  Board makeMove(Move move);

  Move randomMove();

  double checkWinCondition();

  Move getLastMove();
}
