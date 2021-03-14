import 'package:player2/models/boards/board.dart';
import 'package:player2/models/boards/move.dart';

class State {
  double wins = 0;
  int sims = 0;
  Board board;
  int playerNo;

  State(this.board, this.playerNo);

  List<State> getAllPossibleStates() {
    List<Move> moves = board.legalMoves(playerNo);
    List<State> possibleStates = [];
    moves.forEach((move) {
      possibleStates.add(State(board.makeMove(move), 2));
    });
    return possibleStates;
  }
}
