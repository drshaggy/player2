import 'package:player2/models/boards/move.dart';

class TicTacToeMove extends Move {
  TicTacToeMove(playerNo, index) : super(playerNo, index) {
    move = List.filled(9, 0, growable: false);
    move[index] = playerNo;
  }
}
