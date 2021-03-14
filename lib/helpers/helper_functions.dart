List<List<int>> listTo2dArray(List<int> list, List<int> dims) {
  List<List<int>> positionAs2dArray =
      List.generate(dims[0], (index) => List.filled(dims[1], 0));
  list.asMap().forEach((index, element) {
    int a = (index / 3).floor();
    int b = index - a * 3;
    positionAs2dArray[a][b] = element;
  });
  return positionAs2dArray;
}
