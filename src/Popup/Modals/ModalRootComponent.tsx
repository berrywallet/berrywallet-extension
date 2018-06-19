import React from 'react';
import {map} from 'lodash';
import {TransitionGroup, CSSTransition} from "react-transition-group";
import {modalHistory} from './Observer';

import {Transaction} from './components/Transaction';
import {ResetWallet} from './components/ResetWallet';
import {ExchangeModal} from './components/Exchange';

import {
    Router,
    Switch,
    Route,
    RouteComponentProps
} from "react-router-dom";

interface IModalProps {
}

const modalRoutes = {
    '/reset-wallet': ResetWallet,
    '/transaction': Transaction,
    '/exchange': ExchangeModal
};

export class ModalRootComponent extends React.Component<IModalProps> {

    protected renderModalRoute = (component: React.ComponentClass, path: string) => {
        return <Route path={path}
                      key={path}
                      render={(props: RouteComponentProps<{}>) => React.createElement(component, {
                          ...props,
                          ...props.location.state
                      })}
        />
    };

    public render(): JSX.Element {
        return (
            <Router history={modalHistory}>
                <Route render={(props: RouteComponentProps<{}>) => (
                    <TransitionGroup>
                        <CSSTransition key={props.location.key} classNames="-animation" timeout={400}>
                            <Switch location={props.location}>
                                {map(modalRoutes, this.renderModalRoute)}

                                <Route render={() => <div>No popup</div>}/>
                            </Switch>
                        </CSSTransition>
                    </TransitionGroup>
                )}/>
            </Router>
        )
    };
}
