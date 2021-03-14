import 'package:player2/helpers/helper_functions.dart';
import 'package:player2/models/boards/board.dart';
import 'package:player2/models/boards/move.dart';
import 'package:player2/models/boards/tic_tac_toe_move.dart';
import 'package:matrix2d/matrix2d.dart';

class TicTacToeBoard extends Board {
  Matrix2d m2d = Matrix2d();
  List<int> _positionAsList = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  List<int> get positionAsList => _positionAsList;

  TicTacToeBoard() {
    position = "000000000";
    positionToList(position);
  }
  @override
  TicTacToeBoard.copy(TicTacToeBoard board) : super.copy(board);

  TicTacToeBoard.position(String pos) {
    if (pos.length != 9) {
      throw AssertionError(
          "Invalid Position: Length of position string is ${pos.length}, not 9");
    }
    pos.split('').forEach((element) {
      switch (element) {
        case '0':
          break;
        case '1':
          break;
        case '2':
          break;
        default:
          throw AssertionError("Invalid Position: Illegal characters");
      }
    });
    position = pos;
    positionToList(pos);
  }

  @override
  List<Move> legalMoves(int playerNo) {
    List<Move> moves = [];
    _positionAsList.asMap().forEach((index, element) {
      if (element == 0) {
        moves.add(TicTacToeMove(playerNo, index));
      }
    });
    return moves;
  }

  @override
  TicTacToeBoard makeMove(Move move) {
    List<int> newPos = [];
    _positionAsList.asMap().forEach((index, element) {
      if (element != 0 && move.move[index] != 0) {
        throw AssertionError('Illegal Move, piece in position');
      }
      newPos.add(element + move.move[index]);
    });
    TicTacToeBoard newBoard =
        new TicTacToeBoard.position(positionStringFromList(newPos));
    return newBoard;
  }

  @override
  Move randomMove(playerNo) {
    List<Move> moves = legalMoves(playerNo);
    moves.shuffle();
    return moves[0];
  }

  double checkWinCondition() {
    List<List<int>> gameArray = listTo2dArray(_positionAsList, [3, 3]);
    double win = 0;
    if (win == 0)
      gameArray.forEach((row) {
        if (row[0] == 1 && row[1] == 1 && row[2] == 1) {
          win = 1;
        }
        if (row[0] == 2 && row[1] == 2 && row[2] == 2) {
          win = 2;
        }
      });

    if (win == 0)
      gameArray.transpose.forEach((row) {
        if (row[0] == 1 && row[1] == 1 && row[2] == 1) {
          win = 1;
        }
        if (row[0] == 2 && row[1] == 2 && row[2] == 2) {
          win = 2;
        }
      });

    if (win == 0) if (gameArray[0][0] == 1 &&
        gameArray[1][1] == 1 &&
        gameArray[2][2] == 1) {
      win = 1;
    }

    if (win == 0) if (gameArray[0][0] == 2 &&
        gameArray[1][1] == 2 &&
        gameArray[2][2] == 2) {
      win = 2;
    }

    if (win == 0) if (gameArray[0][2] == 1 &&
        gameArray[1][1] == 1 &&
        gameArray[2][0] == 1) {
      win = 1;
    }

    if (win == 0) if (gameArray[0][2] == 2 &&
        gameArray[1][1] == 2 &&
        gameArray[2][0] == 2) {
      win = 2;
    }

    if (win == 0) {
      bool draw = true;
      gameArray.forEach((row) {
        row.forEach((value) {
          if (value == 0) {
            draw = false;
          }
        });
      });
      if (draw == true) win = 0.5;
    }

    return win;
  }

  void positionToList(String pos) {
    pos.split('').asMap().forEach((index, element) {
      positionAsList[index] = int.parse(element);
    });
  }

  static String positionStringFromList(List<int> positionList) {
    String positionString = "";
    positionList.forEach((element) {
      positionString = positionString + element.toString();
    });
    return positionString;
  }
}
