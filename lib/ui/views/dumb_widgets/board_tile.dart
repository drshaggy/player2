import 'package:flutter/material.dart';

class BoardTile extends StatelessWidget {
  final Function updateView;
  final int index;

  BoardTile({@required this.updateView, @required this.index});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () => pressed(),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: Colors.black,
            width: 1,
          ),
        ),
        width: 100,
        height: 100,
      ),
    );
  }

  void pressed() {
    updateView(index);
  }
}
