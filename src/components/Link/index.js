/* @flow */
import React from 'react';
import deepEqual from 'deep-equal';
import withRouter from '../decorators/withRouter';
import {RouterContextPropType} from '../Router';
import {onlyText} from './utils';
import type Urls from '../../urls';
import type {Params, Query, History, Match, Location, LinkCallbackProps} from '../../types';
import type {RouterContextType} from '../Router';


const PROPS_RE = /^(data-|on[A-Z])/;
const A_PROPS = new Set([
    'target',
    'style',
    'className',
    'rel',
    'title',
    'children'
]);


function forwardProps(props) {
    return Object.keys(props).filter(k => A_PROPS.has(k) || k.match(PROPS_RE)).reduce((filtered, k) => {
        filtered[k] = props[k];
        return filtered;
    }, {});
}


type Props = {
    history: History,
    location: Location,
    urls: Urls,
    urlName?: ?string,
    to?: ?string,
    params?: ?Params,
    navigate: (props: *, replace: ?boolean) => void,
    query?: ?Query,
    state?: ?Object,
    replace: boolean,
    exact?: boolean,
    strict?: boolean,
    hash?: ?string,
    activeClassName?: string,
    activeStyle?: Object,
    style?: Object,
    className?: string,
    target?: string,
    onClick?: (event: MouseEvent) => void,
    children?: any,
    isActive?: (match: Match | null, location: Location) => boolean,
    name?: ?string,
    trackingContext?: ?Array<any>
};


class Link extends React.PureComponent {
    static contextTypes = {router: RouterContextPropType};
    context: {router: RouterContextType};
    props: Props;
    ref: ?HTMLElement

    setRef = (e: ?HTMLElement) => {
        if (e) {
            this.context.router.visibleRefProps.set(e, this._getCallbackProps());
        } else if (this.ref) {
            this.context.router.visibleRefProps.delete(this.ref);
        }
        this.ref = e;
    };

    _getCallbackProps = (): LinkCallbackProps => {
        const {children, location, name, params, trackingContext, urlName} = this.props;
        return {location, name, params, text: onlyText(children), trackingContext, urlName};
    }

    onClick = (event) => {
        const {onClick, location, history, target, replace, navigate} = this.props;

        const onClickCallback = this.context.router.onClickCallback;
        if (onClickCallback) {
            onClickCallback(this._getCallbackProps());
        }

        if (onClick) {
            onClick(event);
        }

        if (
            !event.defaultPrevented && // onClick prevented default
            event.button === 0 && // ignore right clicks
            !target && // let browser handle "target=_blank" etc.
            !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) // ignore clicks with modifier keys
        ) {
            event.preventDefault();

            // Replace state before navigation to set scrollY
            history.replace({
                ...location,
                state: {
                    ...location.state,
                    scrollY: window.pageYOffset
                }
            });

            navigate(this.props, replace);
        }
    };

    isActive = () => {
        const {urls, location, urlName, params, exact, strict, isActive} = this.props;

        if (!urlName) {
            return false;
        }

        const match = urls.match(location.pathname, urlName, {exact, strict});

        if (isActive) {
            return isActive(match, location);
        }

        if (match && params) {
            return deepEqual(match.params, params);
        }
        return !!match;
    };

    shouldComponentUpdate(nextProps) {
        const props = {...nextProps};
        if (!props.children || !props.children.length) {
            delete props.children;
        }
        return !deepEqual(this.props, nextProps);
    }

    render() {
        const {
            history,
            urls,
            activeClassName,
            activeStyle,
            ...rest
        } = this.props;

        const useActiveStyle = (activeClassName || activeStyle) ? this.isActive() : false;

        const props = {
            ...forwardProps(rest),
            href: history.createHref(urls.makeLocation(this.props, true)),
            onClick: this.onClick
        };

        if (useActiveStyle) {
            if (activeClassName) {
                props.className = `${props.className || ''} ${activeClassName}`;
            }
            if (activeStyle) {
                props.style = {...props.style, ...activeStyle};
            }
        }

        return <a ref={this.setRef} {...props} />;
    }
}


class LinkWithMiddleware extends React.PureComponent {
    static contextTypes = {router: RouterContextPropType};
    context: {router: RouterContextType};
    static defaultProps = {
        state: {},
        params: {},
        replace: false
    };

    // Allow middleware of the form, e.g. `(props, next) => next(props)` to modify the render function
    renderWithMiddleware = this.context.router.linkMiddleware.reduceRight(
        (next, middleware) => props => middleware(props, next),
        props => <Link {...(props: any)} />
    );

    shouldComponentUpdate(nextProps) {
        const props = {...nextProps};
        if (!props.children || !props.children.length) {
            delete props.children;
        }
        return !deepEqual(this.props, nextProps);
    }

    render() {
        return this.renderWithMiddleware(this.props);
    }
}

export default withRouter(LinkWithMiddleware);
