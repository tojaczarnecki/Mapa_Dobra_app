"use client";

import { Component, type ReactNode } from "react";

type MapErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  resetKey: number;
};

type MapErrorBoundaryState = {
  hasError: boolean;
};

export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: MapErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
