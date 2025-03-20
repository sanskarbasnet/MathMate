declare module "react-native-mathjax" {
  import { Component } from "react";
  import { ViewProps } from "react-native";

  interface MathJaxProps extends ViewProps {
    html: string;
    mathJaxOptions?: {
      messageStyle?: string;
      extensions?: string[];
      jax?: string[];
      tex2jax?: {
        inlineMath?: string[][];
        displayMath?: string[][];
      };
      "HTML-CSS"?: {
        availableFonts?: string[];
      };
    };
  }

  export default class MathJax extends Component<MathJaxProps> {}
}
