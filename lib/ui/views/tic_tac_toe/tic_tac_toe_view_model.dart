import 'package:flutter/cupertino.dart';
import 'package:player2/models/boards/tic_tac_toe_board.dart';
import 'package:player2/models/boards/tic_tac_toe_move.dart';
import 'package:player2/models/monte_carlo_tree_search.dart';
import 'package:player2/ui/views/dumb_widgets/board_tile.dart';
import 'package:player2/ui/views/dumb_widgets/board_tile_full.dart';
import 'package:stacked/stacked.dart';

class TicTacToeViewModel extends BaseViewModel {
  List<Widget> boardLayout;
  int playerNo = 2;
  TicTacToeBoard board;
  String playerPiece = "";
  String gameMessage = "";

  void initialise() {
    gameMessage = "";
    if (playerNo == 1) {
      playerPiece = "Crosses";
    } else {
      playerPiece = "Noughts";
    }
    board = new TicTacToeBoard();
    boardLayout = [];
    for (int i = 0; i < 9; i++) {
      boardLayout.add(BoardTile(index: i, updateView: update));
    }
    if (playerNo == 2) {
      aiMove();
    }
  }

  void playerMove(int index) {
    if (isStillPlaying()) {
      TicTacToeMove move = TicTacToeMove(playerNo, index);
      if (board.playerTurn == playerNo) {
        board = board.makeMove(move);
      } else {
        print("It is not the players turn");
      }
      checkWin();
      generateBoardLayout();
      notifyListeners();
    }
  }

  void aiMove() {
    if (isStillPlaying()) {
      MonteCarloTreeSearch mcts =
          new MonteCarloTreeSearch(board, Duration(seconds: 10));

      board = mcts.findNextMove();

      checkWin();
      generateBoardLayout();
      notifyListeners();
    }
  }

  void update(int index) {
    playerMove(index);
    aiMove();
  }

  void generateBoardLayout() {
    board.positionAsList.asMap().forEach((index, element) {
      if (element == 0) {
        boardLayout[index] = BoardTile(index: index, updateView: update);
      } else if (element == 1) {
        boardLayout[index] = BoardTileFull(playerNo);
      } else if (element == 2) {
        boardLayout[index] = BoardTileFull(3 - playerNo);
      }
    });
  }

  void checkWin() {
    double winCondition = board.checkWinCondition();
    if (winCondition == playerNo) {
      gameMessage = "You Win!";
    } else if (winCondition == 3 - playerNo) {
      gameMessage = "Computer Wins!";
    } else if (winCondition == 0.5) {
      gameMessage = "You Draw!";
    }
  }

  bool isStillPlaying() {
    double winCondition = board.checkWinCondition();
    if (winCondition == 0) {
      return true;
    }
    return false;
  }

  void replay() {
    initialise();
  }
}
