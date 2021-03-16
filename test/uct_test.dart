import 'package:flutter_test/flutter_test.dart';
import 'package:player2/models/uct.dart';

void main() {
  group('UctTest -', () {
    group('uctValue() -', () {
      test('Returns infinity is si is 0', () {
        double val = UCT.uctValue(0, 0, 0);
        expect(val, double.infinity);
      });
      test('Returns 2.3386 is wi is 2, si is 2 and sp is 6', () {
        double val = UCT.uctValue(2, 2, 6);
        expect(double.parse((val).toStringAsFixed(4)), 2.3386);
      });
    });
  });
}
