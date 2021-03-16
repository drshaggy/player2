import 'package:player2/models/boards/board.dart';
import 'package:player2/models/boards/move.dart';

class State {
  double wins = 0;
  int sims = 0;
  Board board;

  State(this.board);

  State.test(this.board, {this.wins = 0, this.sims = 0});

  List<State> getAllPossibleStates() {
    List<Move> moves = board.legalMoves();
    List<State> possibleStates = [];
    moves.forEach((move) {
      possibleStates.add(State(board.makeMove(move)));
    });
    return possibleStates;
  }
}
