import React, {useRef, useEffect, useState,useContext} from 'react';
import './IndiaComponent.scss';
import { select, selectAll,geoPath, geoMercator, min, max, scaleLinear ,geoTransverseMercator} from "d3";
import {feature}from "topojson-client";
import {FetchDataContext} from '../context/fetch-data';
import useDeviceAgent from '../hooks/device-agent';
import {ThemeContext} from '../context/theme';

const IndiaComponent = props=>{
    
    let mapWidth = 300;
    let mapHeight = 300;
    const fetchCovidData = useContext(FetchDataContext);
    const stateDistrictDataJsonUrl = '../map/';
    const requestOption = {
        method:"GET"
    };
    let indiaSvgRef = useRef(),indiaSvg;
    let stateSvgRef = useRef(),stateSvg;
    const [indiaJson,setIndiaJson] = useState();
    const [selectedState, setSelectedState] = useState('');
    const [stateJson,setStateJson] = useState();
    const [hoverState, setHoverState] = useState('');
    const [hoverDistrict, setHoverDistrict] = useState('');
    const {device} = useDeviceAgent();
    const {thememode} = useContext(ThemeContext);   
    const color = {
        confirmed : ["#ccc", "#da4d4d"],
        recovered : ["#e6fff2", "#66CC00"],
        active :["#e6f0ff", "#0000FF"],
        deaths :["#f2f2f2", "#4d4d4d"]
    };
    const [filterdMap, setFilterMap ] = useState('confirmed');
    const [filterData, setFilterData] = useState(null);
    const fetchData = async(dataJsonUrl)=>{
        const response = await fetch(dataJsonUrl,requestOption);
        if(response.ok){
            let resJson = await response.json();
            return resJson;
        }else{
            throw Error("Unable to fetch the data");
        }
    };
    useEffect(()=>{
        const dataCall = async ()=>{
            const indiaJsonUrl = `${stateDistrictDataJsonUrl}india.json`;
            const data = await fetchData(indiaJsonUrl);
            setIndiaJson(data);
        };
        if(fetchCovidData && fetchCovidData.statewise){
            dataCall();
            console.log("filterData called");
            setFilterData(fetchCovidData.statewise[0]);
        }
    },[fetchCovidData]);
    
    // India Map Effect
    useEffect(()=>{
        console.log("effect called");
        let viewBoxWidth ,viewBoxHeight;
        if(indiaJson &&  fetchCovidData.statewise.length>0){
            
            if(device && device.isSmallDevice){
                mapWidth = 300 ;mapHeight = 300 ;
                viewBoxWidth = 300;viewBoxHeight = 300;
            }else{
                mapWidth= 550;mapHeight= 500;
                viewBoxWidth = 500; viewBoxHeight = 600;
            }
            indiaSvg = select(indiaSvgRef.current)
                        .attr("width",mapWidth)
                        .attr("height",mapHeight)
                        .attr("viewBox", `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
            const indianStates = indiaJson.objects["india-states"];
            var states = feature(indiaJson, indianStates);
            states.features.map((featurestate)=>{
                //featurestate.properties[filterdMap] = parseInt(fetchCovidData.statewise.filter((data)=> data.state === featurestate.properties["st_nm"])[0][filterdMap]);
                const filteredData = fetchCovidData.statewise.filter((data)=> data.state === featurestate.properties["st_nm"])[0];
                featurestate.properties["confirmed"] = parseInt(filteredData["confirmed"]);
                featurestate.properties["active"] = parseInt(filteredData["active"]);
                featurestate.properties["recovered"] = parseInt(filteredData["recovered"]);
                featurestate.properties["deaths"] = parseInt(filteredData["deaths"]);
                
            });
            const minProp = min(states.features, feature => feature.properties[filterdMap]);
            const maxProp = max(states.features, feature => feature.properties[filterdMap]);
            const colorScale = scaleLinear().domain([minProp, maxProp]).range(color[filterdMap]);

            // projects geo-coordinates on a 2D plane
            const projection = geoMercator()
                                .fitSize([mapWidth, mapHeight], states);
            const pathGenerator = geoPath().projection(projection);                            
            let prevSelectedState = ''; 
            let selectedState = {};
            indiaSvg.selectAll(".states")
                .data(states.features)
                .enter()
                .append('path')
                .on("click",  (feature,i, nodes) => {                    
                    if(prevSelectedState){
                        select(prevSelectedState).classed("stateselected",false);
                    } 
                    select(nodes[i]).classed("stateselected",true);
                    prevSelectedState = nodes[i];
                    setSelectedState(feature["id"] );
                    setHoverDistrict('');
                    selectedState = {
                        confirmed : feature.properties["confirmed"],
                        active : feature.properties["active"],
                        recovered : feature.properties["recovered"],
                        deaths : feature.properties["deaths"]
                    };
                    setFilterData({...selectedState});
                })
                .on("mouseenter", (feature,i, nodes) => {
                    
                    setHoverState(feature.properties["st_nm"])         
                })
                .on("mouseout", (feature,i, nodes) => {
                    
                    setHoverState('');
                })
                .attr('class',"state")
                .transition()   
                .attr("fill",feature=>colorScale(feature.properties[filterdMap]))
                .attr('d',d=>pathGenerator(d));
            

          
        }
        return (()=>{
            
            selectAll(".indiamap path").remove();
        })
    },[indiaJson,device,filterdMap]);
    useEffect(()=>{
        const dataCall = async ()=>{
            const stateJsonUrl = `${stateDistrictDataJsonUrl}${selectedState.toLowerCase().split(' ').join("")}.json`;
            const data = await fetchData(stateJsonUrl);
            setStateJson(data);
        };
        if(selectedState){
            dataCall();
        }
        
    },[selectedState]);
    useEffect(()=>{
        if(selectedState && stateJson){
            let viewBoxWidth ,viewBoxHeight;
            let filterState,filterDistrict;
            
            if(device && device.isSmallDevice){
                mapWidth = 300 ;mapHeight = 300 ;
                viewBoxWidth = 400;viewBoxHeight = 400;
            }else{
                mapWidth= 550;mapHeight= 500;
                viewBoxWidth = 400; viewBoxHeight = 500;
            }
            //400 500
            stateSvg = select(stateSvgRef.current)
                        .attr("width",mapWidth)
                        .attr("height",mapHeight)
                        .attr("viewBox", `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
            const statesDistrict = stateJson.objects[`${selectedState.toLowerCase().split(' ').join("")}_district`];
            const featureDistrict = feature(stateJson, statesDistrict);
            featureDistrict.features.map((featurestate)=>{
                filterState = fetchCovidData.stateDistrict.filter((data)=> data.state === featurestate.properties["st_nm"])[0];

                filterDistrict = filterState["districtData"].filter((distrctname)=>
                    distrctname.district === featurestate.properties["district"]
                )[0];
                featurestate.properties["confirmed"] = filterDistrict.confirmed;
                featurestate.properties["recovered"] = filterDistrict.recovered;
                featurestate.properties["active"] = filterDistrict.active;
                featurestate.properties["deaths"] = filterDistrict.deceased;
            });
            

            const minProp = min(featureDistrict.features, feature => feature.properties[filterdMap]);
            const maxProp = max(featureDistrict.features, feature => feature.properties[filterdMap]);
            
            
            const colorScale = scaleLinear().domain([minProp, maxProp]).range(color[filterdMap]);

           // projects geo-coordinates on a 2D plane
            const projection = geoMercator()
                                .fitSize([400, 400], featureDistrict);
            const pathGenerator = geoPath().projection(projection);    
            var svgdistrict = stateSvg.selectAll(".district")
            .data(featureDistrict.features)
            .enter()
            .append('path')
            .on("mouseenter", feature => {
                
                setHoverDistrict(feature.properties)         
            })
            .attr('class',"district")
            .transition()   
            .attr("fill",feature=>colorScale(feature.properties[filterdMap]))
            .attr('d',d=>pathGenerator(d));


        }
        return(()=>{
            // Remove old selection before new Useeffect 
            selectAll(".indiastate path").remove();
        })
    },[stateJson,device,filterdMap]);
    return (
        <>
            <div className={`map ${thememode}`}>
                <div className={`indiamap ${thememode}`}>
                    <div className="indiamap__heading-container">
                            <p className="indiamap__heading">India Map</p>
                            <p className="indiamap__detail-message">Select a State for more details</p>
                        {/* <div className="indiamap__detail-message">
                            
                        </div> */}
                    </div>
                   
                    <div className="indiamap__container">
                        {selectedState && 
                        <div className="indiamap__selectedstate">
                            <p className="indiamap__selectedlabel">{"Selected state"}</p>
                            <p className="indiamap__selectedtext">{selectedState}</p>
                        </div>
                        }
                        <svg ref={indiaSvgRef} className={`indiamap__svg ${thememode}`}></svg>
                        { hoverState &&
                        <div className={`indiamap__hoverstate ${thememode}`}>
                            <p className="indiamap__hoverlabel">{"You are on"}</p>
                            <p>{hoverState}</p>
                        </div>
                        }
                        {filterData && 
                        <ul className="indiamap__type">
                            <li className={`indiamap__type-pins mapconfirmed ${filterdMap === 'confirmed' ? 'indiamap__highlight':''} ${thememode}`} onClick={()=>setFilterMap("confirmed")}>
                                <span>Confirmed</span>
                                <span>{filterData.confirmed}</span>
                            </li>
                            <li className={`indiamap__type-pins maprecovered ${filterdMap === 'recovered' ? 'indiamap__highlight':''} ${thememode}`} onClick={()=>setFilterMap("recovered")}> 
                                <span>Recovered</span>
                                <span>{filterData.recovered}</span>
                            </li>
                            <li className={`indiamap__type-pins mapactive ${filterdMap === 'active' ? 'indiamap__highlight':''} ${thememode}`} onClick={()=>setFilterMap("active")}> 
                                <span>Active</span>
                                <span>{filterData.active}</span>
                            </li>
                            <li className={`indiamap__type-pins mapdeaths ${filterdMap === 'deaths' ? 'indiamap__highlight':''} ${thememode}`} onClick={()=>setFilterMap("deaths")}>
                                <span>Deaths</span>
                                <span>{filterData.deaths}</span>
                            </li>
                        </ul>
                        }
                    </div>
                </div>
                {selectedState &&
                    <>
                        <div className={`indiastate ${thememode}`}>
                            <div className="indiamap__heading-container">
                                <p className="indiamap__heading">Districts of {selectedState}</p>
                                <p className="indiamap__detail-message">Select a District for more details</p>
                            </div>
                            {
                                hoverDistrict && 
                                <>
                                <div className="indiastate__hoverdistrict">
                                    <span>{"District:  "}</span>
                                    <span className="indiastate__hoverdistrictname">{hoverDistrict.district}</span>
                                </div>
                                <ul className="indiamap__type">
                                    <li className={`indiamap__type-pins mapconfirmed ${filterdMap === 'confirmed' ? 'indiamap__highlight':''} ${thememode}`} onClick={()=>setFilterMap("confirmed")}>
                                        <span>Confirmed</span>
                                        <span>{hoverDistrict.confirmed}</span>
                                    </li>
                                    <li className={`indiamap__type-pins maprecovered ${filterdMap === 'recovered' ? 'indiamap__highlight':''} ${thememode}`} onClick={()=>setFilterMap("recovered")}> 
                                    <span>Recovered</span>
                                    <span>{hoverDistrict.recovered}</span>
                                    </li>
                                    <li className={`indiamap__type-pins mapactive ${filterdMap === 'active' ? 'indiamap__highlight':''} ${thememode}`} onClick={()=>setFilterMap("active")}> 
                                        <span>Active</span>
                                        <span>{hoverDistrict.active}</span>
                                    </li>
                                    <li className={`indiamap__type-pins mapdeaths ${filterdMap === 'deaths' ? 'indiamap__highlight':''} ${thememode}`} onClick={()=>setFilterMap("deaths")}>
                                        <span>Deaths</span>
                                        <span>{hoverDistrict.deaths}</span>
                                    </li>
                                    {/* <div className="district-stats__confirmed">
                                        <p>Confirmed</p>
                                        <p>{hoverDistrict.confirmed}</p>
                                    </div>
                                    <div className="district-stats__active">
                                        <p>Active</p>
                                        <p>{hoverDistrict.active}</p>
                                    </div>
                                    <div className="district-stats__recovered">
                                        <p>Recovered</p>
                                        <p>{hoverDistrict.recovered}</p>
                                    </div>
                                    <div className="district-stats__deceased">
                                        <p>Deceased</p>
                                        <p>{hoverDistrict.deaths}</p>
                                    </div> */}
                                </ul>
                                </>
                            }      
                            <svg ref={stateSvgRef} className={`indiastate__svg ${thememode}`}></svg>              
                        </div>
                       
                    </>
                }
                {!selectedState && 
                    <div className={`blankmessage ${thememode}`}>
                        Select a state from map
                    </div>
                }      
            </div>
            
            
        </>
    )
}

export default IndiaComponent;