const React = require("react");
const { View } = require("react-native");

let capturedOnChange;

const BottomSheet = React.forwardRef(function BottomSheet(props, ref) {
  capturedOnChange = props.onChange;
  React.useImperativeHandle(ref, () => ({
    snapToIndex: jest.fn(),
    close: jest.fn(),
    expand: jest.fn(),
    collapse: jest.fn(),
  }));
  return React.createElement(View, { testID: "mock-bottom-sheet" }, props.children);
});
BottomSheet.displayName = "BottomSheet";

const BottomSheetView = ({ children, style }) =>
  React.createElement(View, { style }, children);
BottomSheetView.displayName = "BottomSheetView";

const BottomSheetScrollView = ({ children, style, contentContainerStyle }) =>
  React.createElement(View, { style }, children);
BottomSheetScrollView.displayName = "BottomSheetScrollView";

module.exports = {
  __esModule: true,
  default: BottomSheet,
  BottomSheet,
  BottomSheetView,
  BottomSheetScrollView,
  __triggerOnChange: (index) => capturedOnChange?.(index),
};
