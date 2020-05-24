import React, {useEffect, useState,useContext} from 'react';
import './LineChartComponent.scss';
import LineGraph from '../LineGraph/LineGraph';
import {FetchDataContext} from '../../context/fetch-data';
import DropdownComponent from '../../UIComponent/DropdownComponent/DropdownComponent';
const LineChartComponent = props =>{

    const [filterData, setFilterData ] = useState({month:"May"});
    const fetchCovidData = useContext(FetchDataContext);
    const casesTimeSeries = fetchCovidData.casesTimeSeries;
    const [latestData,setLatestData] = useState([]);
    let filterArray = [];
    const onSelectDropdown = (value)=>{
        console.log("value.. ",value);
        if(value && value.type === "months"){
            setFilterData({...filterData,month:value.selectedtype});
        }
    }
    const createFilterArray = ()=>{
        if(Array.isArray(casesTimeSeries) && casesTimeSeries.length > 0){
            filterArray = casesTimeSeries.filter( (item)=>item.date.includes(filterData.month));
            setLatestData(filterArray);
        }
    }
    useEffect(()=>{
        console.log("Line component");
        createFilterArray();
    },[casesTimeSeries,filterData]);
    return (
        <> 
            <div className="line-description-graph">
                <div className="line-dropdown-container">
                    <h3 className="line-caseheading">Daily Cases: </h3>
                    <DropdownComponent type ={"months"} selectDropdown = {e=>onSelectDropdown(e)}/>
                </div>
                <LineGraph latestData={latestData}/>
            </div>
        </>
    );
};

export default LineChartComponent;