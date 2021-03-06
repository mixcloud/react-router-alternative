/* @flow */
import React, {Children} from 'react';
import RouteRenderer from '../RouteRenderer';
import Route from '../Route';
import type {Location, OnNavigateCallback} from '../../types';


export default class Switch extends React.PureComponent {
    static displayName = 'Switch';
    props: {
        children?: any,
        location?: ?Location,
        onNavigate?: ?OnNavigateCallback
    };

    render() {
        if (process.env.NODE_ENV !== 'production') {
            Children.forEach(this.props.children, child => {
                if (child && child.type !== Route) {
                    throw Error(`Switch should only have <Route> components as children - received ${child.type.toString()} instead`);
                }
            });
        }
        return <RouteRenderer location={this.props.location} onNavigate={this.props.onNavigate} routes={Children.toArray(this.props.children).filter(child => !!child).map(route => route.props)} />;
    }
}
