/**
 * @file
 * @author huangzongzhe  zhouminghui
 * 233333
 * TODO: Vote Resource To migrate out of Application
*/

import React, {Component} from 'react';
import {Row, Col, message} from 'antd';
import {DEFAUTRPCSERVER, commonPrivateKey} from '../../../config/config';
import DownloadPlugins from '../../components/DownloadPlugins/DownloadPlugins';
import ContainerRichard from '../../components/ContainerRichard/ContainerRichard';
import VotingYieldChart from '../../components/VotingYieldChart/VotingYieldChart';
import AElfWallet from '../../components/AElfWallet/AElfWallet';
import VotingModule from '../../components/VotingModule/VotingModule';
import {aelf} from '../../utils';
import Svg from '../../components/Svg/Svg';
import getHexNumber from '../../utils/getHexNumber';
import getContractAddress from '../../utils/getContractAddress';
import NightElfCheck from '../../utils/NightElfCheck';
import './Vote.styles.less';

let nightElf;
export default class VotePage extends Component {

    // currenrWallet 默认应该取第一个钱包 因为 Wallet 和 VoteList 都需要钱包的信息
    constructor(props) {
        super(props);
        this.informationTimer;
        let wallet = null;
        if (localStorage.currentWallet) {
            wallet = {
                address: '',
                walletName: '',
                privateKey: commonPrivateKey,
                publicKey: ''
            };
        }
        this.information = [{
            title: 'Voter Turnout',
            info: '-',
            icon: 'people_counting'
        },
        {
            title: 'Ballot Count',
            info: '-',
            icon: 'poll'
        },
        {
            title: 'Bonus Pool',
            info: '-',
            icon: 'fenhong_icon'
        }];

        this.state = {
            currentWallet: wallet,
            information: this.information,
            contracts: null,
            consensus: null,
            dividends: null,
            tokenContract: null,
            showDownloadPlugins: false,
            showWallet: false,
            nightElf: null
        };
    }

    componentDidMount() {
        let httpProvider = DEFAUTRPCSERVER;
        // getContract
        getContractAddress().then(result => {
            this.setState({
                contracts: result
            });
            aelf.chain.contractAtAsync(result.CONSENSUSADDRESS, result.wallet, (error, result) => {
                this.setState({
                    consensus: result
                });
                this.getInformation(result);
            });

            aelf.chain.contractAtAsync(result.DIVIDENDSADDRESS, result.wallet, (error, result) => {
                this.setState({
                    dividends: result
                });
            });

            aelf.chain.contractAtAsync(result.TOKENADDRESS, result.wallet, (error, result) => {
                this.setState({
                    tokenContract: result
                });
            });
        });

        // getExtensionKeypairList
        NightElfCheck.getInstance().check.then(item => {
            if (item) {
                nightElf = new window.NightElf.AElf({
                    httpProvider,
                    appName: 'AELF.io'
                });
                if (nightElf) {
                    this.setState({
                        nightElf
                    });
                    nightElf.chain.connectChain((error, result) => {
                        if (result) {
                            this.getNightElfKeypairList();
                        }
                    });
                }
            }
        }).catch(error => {
            this.setState({
                showDownloadPlugins: true
            });
        });
    }

    componentWillUnmount() {
        clearTimeout(this.informationTimer);
        this.setState = () => {};
    }


    getInformation(consensus) {
        const {information} = this.state;
        consensus.GetVotesCount((error, result) => {
            let temp = information;
            temp[0].info = getHexNumber(result.return).toLocaleString();
            this.setState({
                information: temp
            });
        });

        consensus.GetTicketsCount((error, result) => {
            let temp = information;
            temp[1].info = getHexNumber(result.return).toLocaleString();
            this.setState({
                information: temp
            });
        });

        consensus.QueryCurrentDividends((error, result) => {
            let temp = information;
            temp[2].info = getHexNumber(result.return).toLocaleString();
            this.setState({
                information: temp
            });
        });

        this.informationTimer = setTimeout(() => {
            this.getInformation(consensus);
        }, 60000);
    }

    getNightElfKeypairList() {
        window.NightElf.api({
            appName: 'hzzTest',
            method: 'GET_ADDRESS'
        }).then(result => {
            let showWallet = null;
            if (result.error !== 0) {
                let wallet = {
                    address: '',
                    name: '',
                    privateKey: commonPrivateKey,
                    publicKey: ''
                };
                localStorage.setItem('currentWallet', JSON.stringify(wallet));
                message.warning(result.errorMessage.message, 5);
                showWallet = false;
            }
            else if (result.addressList.length !== 0) {
                localStorage.setItem('walletInfoList', JSON.stringify(result.addressList));
                if (localStorage.currentWallet === undefined) {
                    localStorage.setItem('currentWallet', JSON.stringify(result.addressList[0]));
                }
                if (JSON.parse(localStorage.currentWallet).name === '') {
                    localStorage.setItem('currentWallet', JSON.stringify(result.addressList[0]));
                }
                showWallet = true;
            }
            else {
                let wallet = {
                    address: '',
                    name: '',
                    privateKey: commonPrivateKey,
                    publicKey: ''
                };
                localStorage.setItem('currentWallet', JSON.stringify(wallet));
                showWallet = false;
            }
            this.setState({
                showWallet,
                currentWallet: JSON.parse(localStorage.currentWallet),
                walletInfoList: result.addressList
            });
        });
    }

    hideWallet() {
        this.setState({
            showWallet: false
        });
    }

    getCurrentWallet() {
        this.setState({
            currentWallet: JSON.parse(localStorage.currentWallet)
        });
    }

    renderVoteInformation() {
        const VoteHtml = this.state.information.map(item =>
                <Col xs={24} sm={24} md={6} lg={6} xl={6}
                     className='vote-info-con'
                     key={item.title + Math.random()}
                >
                    <ContainerRichard type='small'>
                        <div
                            className='vote-info-content-con'
                        >
                            <div className='vote-info-title'>
                                <Svg
                                    icon={item.icon}
                                    style={{width: '20px', height: '20px', display: 'inline-block', margin: '5px 5px'}}
                                />
                                {item.title}
                            </div>
                            <div className='vote-info-num'>{item.info.toLocaleString() || '-'}</div>
                        </div>
                    </ContainerRichard>
                </Col>
        );
        return VoteHtml;
    }

    getDownloadPluginsHTML() {
        return <DownloadPlugins />;
    }

    getAElfWallet() {
        const {showWallet, walletInfoList, consensus, dividends, tokenContract, contracts, nightElf} = this.state;
        if (showWallet) {
            return <AElfWallet
                title='AElf Wallet'
                walletInfoList={walletInfoList}
                getCurrentWallet={this.getCurrentWallet.bind(this)}
                hideWallet={this.hideWallet.bind(this)}
                consensus={consensus}
                dividends={dividends}
                contracts={contracts}
                tokenContract={tokenContract}
                nightElf={nightElf}
            />;
        }
    }

    render() {
        const {consensus, showDownloadPlugins, currentWallet, dividends, contracts, nightElf} = this.state;
        const VoteHtml = this.renderVoteInformation();
        const aelfWalletHTML = this.getAElfWallet();
        let downloadPlugins = null;
        if (showDownloadPlugins) {
            downloadPlugins = this.getDownloadPluginsHTML();
        }
        return (
            <div className='VotePage'>
                {downloadPlugins}
                <div className='Voting-information'>
                    <Row type="flex" justify="space-between">
                        {VoteHtml}
                    </Row>
                </div>
                <VotingYieldChart title='Historical voting gains' dividends={dividends}/>
                {aelfWalletHTML}
                <div className='vote-box' >
                    <VotingModule
                        currentWallet={currentWallet}
                        consensus={consensus}
                        contracts={contracts}
                        nightElf={nightElf}
                    />
                </div>
            </div>
            // <div className='apps-page-container'>AELF Applications List Page.</div>
        );
    }
}
