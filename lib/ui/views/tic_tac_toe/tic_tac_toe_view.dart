import 'package:flutter/material.dart';
import 'package:player2/ui/views/tic_tac_toe/tic_tac_toe_view_model.dart';
import 'package:stacked/stacked.dart';

class TicTacToeView extends StatelessWidget {
  const TicTacToeView({Key key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<TicTacToeViewModel>.reactive(
      onModelReady: (model) => model.initialise(),
      builder: (context, model, child) => Scaffold(
        body: Row(
          children: [
            SizedBox(
              width: 200,
              child: Column(
                children: [
                  ListTile(
                    title: Text('Player'),
                    subtitle: Text(model.playerPiece),
                  )
                ],
              ),
            ),
            Expanded(
              child: Column(
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(vertical: 30),
                    child: Text(model.gameMessage),
                  ),
                  model.gameMessage == ""
                      ? Container()
                      : TextButton(
                          onPressed: () => model.replay(),
                          child: Text("Replay"),
                          style: ButtonStyle(
                            backgroundColor: MaterialStateProperty.all<Color>(
                                Colors.blue[300]),
                            foregroundColor:
                                MaterialStateProperty.all<Color>(Colors.white),
                          ),
                        ),
                  Expanded(
                    child: Center(
                      child: Container(
                        width: 300,
                        height: 300,
                        child: GridView.builder(
                          itemCount: 9,
                          itemBuilder: (context, index) =>
                              model.boardLayout[index],
                          gridDelegate:
                              SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      viewModelBuilder: () => TicTacToeViewModel(),
    );
  }
}
