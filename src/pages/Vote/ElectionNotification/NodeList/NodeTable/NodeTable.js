import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';
import { Table, message, Button, Input, Icon } from 'antd';
// import Highlighter from 'react-highlight-words';
import {
  getAllTeamDesc,
  fetchPageableCandidateInformation,
  fetchElectorVoteWithRecords
} from '@api/vote';
import { fetchCurrentMinerList } from '@api/consensus';
import getCurrentWallet from '@utils/getCurrentWallet';
import {
  NODE_DEFAULT_NAME,
  FROM_WALLET,
  A_NUMBER_LARGE_ENOUGH_TO_GET_ALL
} from '@src/pages/Vote/constants';

import './index.less';

const clsPrefix = 'node-list';

const pagination = {
  showQuickJumper: true,
  total: 0,
  showTotal: total => `Total ${total} items`,
  pageSize: 3
};

class NodeTable extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      refresh: 0,
      loading: false,
      consensus: null,
      allVotes: 0,

      nodeList: [],
      totalVotesAmount: null,
      searchText: ''
    };

    this.hasRun = false;
  }

  // todo: how to combine cdm & cdu
  async componentDidMount() {
    const { electionContract } = this.props;

    if (electionContract !== null) {
      // Need await to ensure the totalVotesCount take its seat.
      await this.fetchTotalVotesAmount();
      this.fetchNodes();
    }
  }

  async componentDidUpdate(prevProps) {
    const { electionContract, consensusContract } = this.props;

    if (electionContract && consensusContract && !this.hasRun) {
      this.hasRun = true;
      // Need await to ensure the totalVotesCount take its seat.
      await this.fetchTotalVotesAmount();
      this.fetchNodes();
    }
  }

  handleSearch = (selectedKeys, confirm) => {
    confirm();
    this.setState({ searchText: selectedKeys[0] });
  };

  handleReset = clearFilters => {
    clearFilters();
    this.setState({ searchText: '' });
  };

  getColumnSearchProps = dataIndex => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={node => {
            this.searchInput = node;
          }}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={e =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => this.handleSearch(selectedKeys, confirm)}
          style={{ width: 188, marginBottom: 8, display: 'block' }}
        />
        <Button
          type='primary'
          onClick={() => this.handleSearch(selectedKeys, confirm)}
          icon='search'
          size='small'
          style={{ width: 90, marginRight: 8 }}
        >
          Search
        </Button>
        <Button
          onClick={() => this.handleReset(clearFilters)}
          size='small'
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </div>
    ),
    filterIcon: filtered => (
      <Icon type='search' style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes(value.toLowerCase()),
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => this.searchInput.select());
      }
    }
    // render: text => (
    //   <Highlighter
    //     highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
    //     searchWords={[this.state.searchText]}
    //     autoEscape
    //     textToHighlight={text.toString()}
    //   />
    // )
  });

  // todo: the comment as follows maybe wrong, the data needs to share is the user's vote records
  // todo: consider to move the method to Vote comonent, because that also NodeTable and Redeem Modal needs the data;
  fetchNodes() {
    const { electionContract, consensusContract } = this.props;
    console.log('InTable', electionContract);
    const currentWallet = getCurrentWallet();

    Promise.all([
      fetchPageableCandidateInformation(electionContract, {
        start: 0,
        length: A_NUMBER_LARGE_ENOUGH_TO_GET_ALL // give a number large enough to make sure that we get all the nodes
        // FIXME: [unstable] sometimes any number large than 5 assign to length will cost error when fetch data
      }),
      getAllTeamDesc(),
      fetchElectorVoteWithRecords(electionContract, {
        value: currentWallet.pubKey
      }),
      fetchCurrentMinerList(consensusContract)
    ])
      .then(resArr => {
        console.log('resArr', resArr);
        // process data
        const processedNodesData = this.processNodesData(resArr);
        console.log('GetPageableCandidateInformation', processedNodesData);

        this.setState({
          nodeList: processedNodesData
        });
      })
      .catch(err => {
        console.log('GetPageableCandidateInformation', err);
      });
  }

  processNodesData(resArr) {
    const { totalVotesAmount } = this.state;

    // todo: error handle
    const nodeInfos = resArr[0].value;
    const activeVotingRecords = resArr[2].activeVotingRecords;
    let teamInfos = null;
    if (resArr[1].code === 0) {
      teamInfos = resArr[1].data;
    }
    const BPNodes = resArr[3].pubkeys;
    // add node name, add my vote amount
    nodeInfos.forEach(item => {
      // add node name
      const teamInfo = teamInfos.find(
        team => team.public_key === item.candidateInformation.pubkey
      );
      console.log('teamInfo', teamInfo);
      if (teamInfo === undefined) {
        // todo: use address instead after api modified
        item.candidateInformation.name =
          item.candidateInformation.candidateAddresss;
      } else {
        item.candidateInformation.name = teamInfo.name;
      }

      // add my vote amount
      const myVoteRecords = activeVotingRecords.filter(
        votingRecord =>
          votingRecord.candidate === item.candidateInformation.pubkey
      );
      const myTotalVoteAmount = myVoteRecords.reduce((total, current) => {
        return total + +current.amount;
      }, 0);
      console.log('myTotalVoteAmount', myTotalVoteAmount || '-');
      item.candidateInformation.myTotalVoteAmount = myTotalVoteAmount || '-';

      if (BPNodes.indexOf(item.candidateInformation.pubkey) !== -1) {
        item.candidateInformation.nodeType = 'BP';
      } else {
        item.candidateInformation.nodeType = 'Candidate';
      }
    });

    return nodeInfos
      .map(item => ({
        ...item.candidateInformation,
        obtainedVotesAmount: item.obtainedVotesAmount,
        votedRate: (
          (item.obtainedVotesAmount / totalVotesAmount) *
          100
        ).toFixed(2)
      }))
      .filter(item => item.isCurrentCandidate)
      .sort((a, b) => b.obtainedVotesAmount - a.obtainedVotesAmount) // todo: is it accurate?
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        terms: item.terms.length
      }));
  }

  fetchTotalVotesAmount() {
    this.props.electionContract.GetVotesAmount.call().then(res => {
      if (res === null) {
        message.error('Get total vote amount failed.');
        return;
      }

      this.setState({
        totalVotesAmount: res.value
      });
    });
  }

  render() {
    // const voteInfoColumn = this.getVoteInfoColumn();
    const { nodeList, loading } = this.state;
    const nodeListCols = [
      {
        title: 'Rank',
        dataIndex: 'rank',
        key: 'rank',
        defaultSortOrder: 'ascend',
        sorter: (a, b) => a.rank - b.rank
      },
      {
        title: 'Node Name',
        dataIndex: 'name',
        key: 'nodeName',
        // width: 270,
        // todo: ellipsis useless
        // ellipsis: true,
        render: (text, record) => (
          <Link
            to={{ pathname: '/vote/team', search: `pubkey=${record.pubkey}` }}
            className='node-name-in-table'
            // style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}
            style={{ width: 270 }}
          >
            {text}
          </Link>
        ),
        ...this.getColumnSearchProps('name')
      },
      {
        title: 'Node Type',
        dataIndex: 'nodeType',
        key: 'nodeType'
        // todo: write the sorter after the api is ready
        // sorter: (a, b) => a.nodeType - b.nodeType
      },
      {
        title: 'Terms',
        dataIndex: 'terms',
        key: 'terms',
        defaultSortOrder: 'descend',
        sorter: (a, b) => a.terms - b.terms
      },
      {
        title: 'Produce Blocks',
        dataIndex: 'producedBlocks',
        key: 'producedBlocks',
        defaultSortOrder: 'descend',
        sorter: (a, b) => a.producedBlocks - b.producedBlocks
      },
      {
        title: 'Obtained Votes Count',
        dataIndex: 'obtainedVotesAmount',
        key: 'obtainedVotesCount',
        defaultSortOrder: 'descend',
        sorter: (a, b) => a.obtainedVotesAmount - b.obtainedVotesAmount
      },
      {
        title: 'Voted Rate',
        key: 'votedRate',
        dataIndex: 'votedRate',
        defaultSortOrder: 'descend',
        render: value => `${value}%`,
        sorter: (a, b) => a.votedRate - b.votedRate
      },
      {
        title: 'My Votes',
        key: 'myVotes',
        dataIndex: 'myTotalVoteAmount',
        sorter: (a, b) => a.myTotalVoteAmount - b.myTotalVoteAmount
      },
      {
        title: 'Operations',
        key: 'operations',
        render: (text, record) => (
          <div className='node-list-btn-group'>
            {/* todo: replace pubkey by address? */}
            <Button
              className='vote-btn'
              key={record.pubkey}
              type='primary'
              style={{ marginRight: '20px' }}
              data-nodeaddress={record.candidateAddresss}
              data-targetPublicKey={record.pubkey}
              data-role='vote'
              data-nodename={record.name}
              data-shoulddetectlock
              data-votetype={FROM_WALLET}
            >
              Vote
            </Button>
            <Button
              key={record.pubkey + 1}
              type='primary'
              data-role='redeem'
              data-shoulddetectlock
              data-nodeaddress={record.candidateAddresss}
              data-targetPublicKey={record.pubkey}
              data-nodename={record.name}
              disabled={record.myTotalVoteAmount > 0 ? false : true}
            >
              Redeem
            </Button>
          </div>
        )
      }
    ];

    nodeListCols.forEach(item => {
      item.align = 'center';
    });
    // const { handleTableChange } = this;
    return (
      <section className='vote-table'>
        <Table
          columns={nodeListCols}
          dataSource={nodeList}
          // onChange={handleTableChange}
          // loading={loading}
          pagination={pagination}
          rowKey={record => record.pubkey}
        />
      </section>
    );
  }
}

export default NodeTable;
