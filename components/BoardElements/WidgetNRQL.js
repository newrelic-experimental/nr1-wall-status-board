import React, { Component,  } from 'react';
import PropTypes from 'prop-types';
import { StatusBlock } from './'
import {NerdGraphQuery} from 'nr1'
import  moment from 'moment'



export default class WidgetNRQL extends Component {
    static propTypes = {
        accountId: PropTypes.number.isRequired,
        autoRefresh: PropTypes.number.isRequired,
    }

    constructor(props) {
        super(props);
        this.state = {data: null}
    }

    async componentDidMount() {
        this.loadData()
        this.autoRefresh = setInterval(() => this.loadData(), this.props.autoRefresh ? this.props.autoRefresh*1000 : 60*1000) //auto refresh 1 minute;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.pageRef!==this.props.pageRef){
            this.setState({data: null})
            this.loadData()

        }
    }

    componentWillUnmount() {
        clearInterval(this.autoRefresh);
    }

    loadData() {
        const { config } = this.props
        const { nrql,field, subField, bucketSize, untilSeconds, additionalQueries} = config
        let accountId = config.accountId ? config.accountId : this.props.accountId

        //The history buckets need to be fixed time periods so that the data within them doesnt shift as time progresses. So lets find the end of the last bucket rounded to a fixed time interval such as 5 minutes
        const date_round = function(date, duration) { return moment(Math.floor((+date)/(+duration)) * (+duration)) }
        let now = moment()
        now.subtract(1,'minutes') //exclude the last minute of data
        let endTime = date_round(now, moment.duration(bucketSize, 'minutes'))
        let startTime= endTime.clone().subtract(bucketSize*24,'minutes')
        let sinceAdjusted = Number(bucketSize) +  Math.round(Number(untilSeconds)/60)

        const variables = {
            id: Number(accountId)
        }

        //add any additional queries to the graphql
        let extraNRQL=""
        if(additionalQueries) {
            Object.keys(additionalQueries).forEach((key)=>{
                //only add the recent restriction if no since clause already
                let q=additionalQueries[key].toLowerCase().includes("since")  ? additionalQueries[key] : `${additionalQueries[key]}  since ${sinceAdjusted} minutes ago until ${untilSeconds} seconds ago`
                extraNRQL+=`
                    ${key}: nrql(query: "${q}") {results}
                `
            })
        }

        let query = `
        query($id: Int!) {
            actor {
                account(id: $id) {
                    recent: nrql(query: "${nrql} since ${sinceAdjusted} minutes ago until ${untilSeconds} seconds ago") {results}
                    buckets: nrql(query: "${nrql} timeseries ${bucketSize} minutes since ${startTime.unix()} until ${endTime.unix()}") {results}
                    ${extraNRQL}
                }
            }
        }
        `

        const x = NerdGraphQuery.query({ query: query, variables: variables, fetchPolicyType: NerdGraphQuery.FETCH_POLICY_TYPE.NO_CACHE });
        x.then(results => {
            if(config.debugMode===true) {
                console.log(`DEBUG MODE ENABLED: ${config.title}`,results.data.actor.account)
            }

            let bucketData=results.data.actor.account.buckets.results

            let itemCurrentData=null
            let checkedField = field
            let checkedSubField = subField

            if (results.data.actor.account.recent.results.length > 0){
                checkedField = checkFieldName(field, results.data.actor.account.recent.results[0], config.debugMode)

                if (results.data.actor.account.recent.results[0][checkedField] != null) {
                    itemCurrentData = results.data.actor.account.recent.results[0][checkedField]
                } else if (results.data.actor.account.recent.results[0][checkedField] === null) {
                    console.error(`No data found for panel '${config.title}': Please check the NRQL query to ensure it returns a result.`, results.data.actor.account.buckets.results)
                }
                 else {
                    console.error(`Error with '${config.title}' panel: Please supply a field name to access the data returned.`, results.data.actor.account.buckets.results)
                }

                if (results.data.actor.account.recent.results[0][checkedField] != null && typeof results.data.actor.account.recent.results[0][checkedField] === 'object') {
                    checkedSubField = checkFieldName(subField, results.data.actor.account.recent.results[0][checkedField], config.debugMode)

                    itemCurrentData = results.data.actor.account.recent.results[0][checkedField][checkedSubField]

                    if (itemCurrentData === undefined) {
                        itemCurrentData = null
                        console.error(`Error with '${config.title}' panel: The provided sub field name does is incorrect.`, results.data.actor.account.buckets.results)
                    }
                }
            }

            let data = {
                "current": itemCurrentData,
                "history": bucketData.map((item)=>{ return { value: checkedSubField ? item[checkedField][checkedSubField] : item[checkedField], startTime:item.beginTimeSeconds, endTime: item.endTimeSeconds }})
            }

            if(additionalQueries) {
                data.additional={}
                Object.keys(additionalQueries).forEach((key)=>{
                    data.additional[key]=results.data.actor.account[key].results
                })
            }
            this.setState({ data: data  })
        }).catch((error) => { console.log(error); })
    }

    //custom features example
    /*
        This simply displays the results of another query (as specified in the config with the name 'exampleQuery')
        The idea is that the query is already loaded
    */
    featureEXAMPLE(config,data) {
        if(data.additional && data.additional.exampleQuery) { //the query key in the config set to "exampleQuery"
            return { value: `${data.additional.exampleQuery[0].apps} apps reporting`, tooltip: `There could be even more detail here`}
        }
    }

    render() {
        let {config} = this.props
        let {title, roundTo, valueLabel, valueSuffix, thresholdType, thresholdDirection, thresholdCritical, thresholdCriticalLabel, thresholdWarning, thresholdWarningLabel, thresholdNormalLabel, customFeature, link} = config
        let {data} = this.state

        const determineStatus = (val) => {
            let returnType="N"
            if(thresholdType) {
                if(thresholdType == "numeric") {
                    if(thresholdDirection && thresholdDirection=='below') {
                        returnType =  (val <= thresholdWarning) ? "W" : returnType
                        returnType =  (val <= thresholdCritical) ? "C" : returnType
                    } else {
                        returnType =  (val >= thresholdWarning) ? "W" : returnType
                        returnType =  (val >= thresholdCritical) ? "C" : returnType
                    }
                }
                if(thresholdType == "string") {
                    try {
                        if(thresholdWarning) {
                            let regexW = new RegExp(thresholdWarning)

                            if( regexW.test(val) ) {
                                returnType= "W"
                            }
                        }
                        if(thresholdCritical) {
                            let regexC = new RegExp(thresholdCritical)
                            if( regexC.test(val) ) {
                                returnType= "C"
                            }
                        }
                    } catch(e) {
                        console.error(`regex failed`)
                    }
                }
            }
            return returnType
        }

        const formatValue = (val) => {
            let formattedVal=val

            let status = determineStatus(val)
            if(status==="N" && thresholdNormalLabel) {
                formattedVal = thresholdNormalLabel
            } else if(status==="W" && thresholdWarningLabel) {
                formattedVal = thresholdWarningLabel
            } else if(status==="C" && thresholdCriticalLabel) {
                formattedVal = thresholdCriticalLabel
            } else {
                //no labels provided so show value
                if(roundTo && !isNaN(roundTo) && roundTo > 0) {
                    formattedVal=Number(val).toFixed(roundTo)
                } else {
                    formattedVal=Math.round(Number(val))
                }
                formattedVal = isNaN(formattedVal) ? val : formattedVal //deal with nan's
            }
            return formattedVal
        }

        if(data) {
            let {current, history} = data

            let toolTipValueSuffix = valueSuffix ? " "+valueSuffix : ""
            let historyBlocks=[]
            for (let i=1; i <=24; i++) {
                if(history[history.length-i]) {
                    historyBlocks.push({status:determineStatus(history[history.length-i].value), value:formatValue(history[history.length-i].value)+toolTipValueSuffix, startTime: history[history.length-i].startTime, endTime: history[history.length-i].endTime})
                }
            }

            //extra info processor
            let info=null, infoTooltip=null
            if(customFeature) {
                //support for plugging in your own custom features here!
                switch(customFeature) {
                    case "example":
                        
                        let fdata=this.featureEXAMPLE(config,data)
                        info=(fdata && fdata.value) ? fdata.value : null
                        infoTooltip=(fdata && fdata.tooltip) ? fdata.tooltip : null
                        
                        break;
                    // case "somethingElse":
                    //     break;
                }
            }

            return <StatusBlock title={title} bigValue={formatValue(current)} bigValueLabel={valueLabel} bigValueSuffix={valueSuffix} status={determineStatus(current)} history={historyBlocks} info={info} infoTooltip={infoTooltip} link={link}/>
        } else {
            return <><StatusBlock title={title} /></>
        }
    }
}

function checkFieldName (field, results, isDebug) {
    let ret = field

    if (field == null) {
        if (Object.getOwnPropertyNames(results)[0] != null) {
            ret = Object.getOwnPropertyNames(results)[0]

            if (isDebug) {
                console.log(`No field name was specified, defaulting to first property name '${ret}'.`)
            }
        }
    }

    return ret
}
