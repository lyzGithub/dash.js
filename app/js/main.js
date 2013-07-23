/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var player,
    playing = false,
    time = -1,
    timer,
    videoMetricsTreeView,
    audioMetricsTreeView,
    bufferChart,
    streams,
    videoSeries,
    audioSeries,
    maxGraphPoints = 50,
    graphUpdateInterval = 333;

function buildBufferGraph() {
    "use strict";
    videoSeries = {
        data: [],
        label: "Video",
        color: "#2980B9"
    };

    audioSeries = {
        data: [],
        label: "Audio",
        color: "#E74C3C"
    };

    bufferChart = $.plot("#buffer-placeholder", [audioSeries, videoSeries], {
        series: {
            shadowSize: 0
        },
        yaxis: {
            min: 0,
            max: 15
        },
        xaxis: {
            show: false
        }
    });

    bufferChart.draw();
}

function abrUpClicked(type) {
    "use strict";
    var newQuality,
        metricsExt = player.getMetricsExt(),
        max = metricsExt.getMaxIndexForBufferType(type);

    newQuality = player.getQualityFor(type) + 1;

    // zero based
    if (newQuality >= max) {
        newQuality = max - 1;
    }

    player.setQualityFor(type, newQuality);
}

function abrDownClicked(type) {
    "use strict";
    var newQuality = player.getQualityFor(type) - 1;

    if (newQuality < 0) {
        newQuality = 0;
    }

    player.setQualityFor(type, newQuality);
}

function abrAutoChanged() {
    "use strict";
    var value = !player.getAutoSwitchQuality();
    player.setAutoSwitchQuality(value);
}

function init() {
    "use strict";
    $(document).ready(
        function () {
            $("#hide-debug")
                .click(
                    function (event) {
                        $("#debug-body").hide();
                        $("#debug-header").addClass("tooltip-box-bottom");
                    }
                );
            $("#show-debug")
                .click(
                    function (event) {
                        $("#debug-body").show();
                        $("#debug-header").removeClass("tooltip-box-bottom");
                    }
                );
            $("#hide-graph")
                .click(
                    function (event) {
                        $("#graph-body").hide();
                        $("#graph-header").addClass("tooltip-box-bottom");
                    }
                );
            $("#show-graph")
                .click(
                    function (event) {
                        $("#graph-body").show();
                        $("#graph-header").removeClass("tooltip-box-bottom");
                    }
                );
            $("#video-abr-up")
                .click(
                    function (event) {
                        abrUpClicked("video");
                    }
                );

            $("#video-abr-down")
                .button()
                .click(
                    function (event) {
                        abrDownClicked("video");
                    }
                );

            $("#audio-abr-up")
                .click(
                    function (event) {
                        abrUpClicked("audio");
                    }
                );

            $("#audio-abr-down")
                .button()
                .click(
                    function (event) {
                        abrDownClicked("audio");
                    }
                );

            $("#abr-auto-on")
                .click(
                    function (event) {
                        abrAutoChanged();
                    }
                );

            $("#abr-auto-off")
                .click(
                    function (event) {
                        abrAutoChanged();
                    }
                );
        }
    );

    buildBufferGraph();

    $("#graph-body").hide();
    $("#graph-header").addClass("tooltip-box-bottom");

    $("#debug-body").hide();
    $("#debug-header").addClass("tooltip-box-bottom");

    Q.longStackJumpLimit = 0;
}

function populateMetricsFor(type, bitrateValue, bitrateIndex, pendingIndex, numBitrates, bufferLength, droppedFrames, series) {
    "use strict";
    var video = document.querySelector(".dash-video-player video"),
        metrics = player.getMetricsFor(type),
        metricsExt = player.getMetricsExt(),
        repSwitch,
        bufferLevel,
        httpRequest,
        droppedFramesMetrics,
        bitrateIndexValue,
        bandwidthValue,
        pendingValue,
        numBitratesValue,
        bufferLengthValue = 0,
        point,
        lastFragmentDuration,
        lastFragmentDownloadTime,
        droppedFramesValue = 0;

    if (metrics && metricsExt) {
        repSwitch = metricsExt.getCurrentRepresentationSwitch(metrics);
        bufferLevel = metricsExt.getCurrentBufferLevel(metrics);
        httpRequest = metricsExt.getCurrentHttpRequest(metrics);
        droppedFramesMetrics = metricsExt.getCurrentDroppedFrames(metrics);

        if (repSwitch !== null) {
            bitrateIndexValue = metricsExt.getIndexForRepresentation(repSwitch.to);
            bandwidthValue = metricsExt.getBandwidthForRepresentation(repSwitch.to);
            bandwidthValue = bandwidthValue / 1000;
            bandwidthValue = Math.round(bandwidthValue);
        }

        numBitratesValue = metricsExt.getMaxIndexForBufferType(type);

        if (bufferLevel !== null) {
            bufferLengthValue = bufferLevel.level.toPrecision(5);
        }

        if (httpRequest !== null) {
            lastFragmentDuration = httpRequest.mediaduration;
            lastFragmentDownloadTime = httpRequest.tresponse.getTime() - httpRequest.trequest.getTime();

            // convert milliseconds to seconds
            lastFragmentDownloadTime = lastFragmentDownloadTime / 1000;
            lastFragmentDuration = lastFragmentDuration.toPrecision(4);
        }

        if (droppedFramesMetrics !== null) {
            droppedFramesValue = droppedFramesMetrics.droppedFrames;
        }

        if (isNaN(bandwidthValue) || bandwidthValue === undefined) {
            bandwidthValue = 0;
        }

        if (isNaN(bitrateIndexValue) || bitrateIndexValue === undefined) {
            bitrateIndexValue = 0;
        }

        if (isNaN(numBitratesValue) || numBitratesValue === undefined) {
            numBitratesValue = 0;
        }

        if (isNaN(bufferLengthValue) || bufferLengthValue === undefined) {
            bufferLengthValue = 0;
        }

        bitrateValue.innerHTML = bandwidthValue + " kbps";
        bitrateIndex.innerHTML = bitrateIndexValue + 1;

        pendingValue = player.getQualityFor(type);
        if (pendingValue !== bitrateIndexValue) {
            pendingIndex.innerHTML = "(-> " + (pendingValue + 1) + ")";
        } else {
            pendingIndex.innerHTML = "";
        }

        numBitrates.innerHTML = numBitratesValue;
        bufferLength.innerHTML = bufferLengthValue;
        droppedFrames.innerHTML = droppedFramesValue;
        //fragDuration.innerHTML = lastFragmentDuration;
        //fragTime.innerHTML = lastFragmentDownloadTime;

        point = [parseFloat(video.currentTime), Math.round(parseFloat(bufferLengthValue))];
        series.data.push(point);

        if (series.data.length > maxGraphPoints) {
            series.data = series.data.slice(series.data.length - maxGraphPoints);
        }
    }
}

function update() {
    "use strict";
    if (playing) {
        var video = document.querySelector(".dash-video-player video"),
            newTime = video.currentTime;

        if (newTime !== time) {
            populateMetricsFor(
                "video",
                document.getElementById("video-value"),
                document.getElementById("video-index"),
                document.getElementById("video-pending-index"),
                document.getElementById("num-video-bitrates"),
                document.getElementById("video-buffer"),
                document.getElementById("video-dropped-frames"),
                videoSeries
            );

            populateMetricsFor(
                "audio",
                document.getElementById("audio-value"),
                document.getElementById("audio-index"),
                document.getElementById("audio-pending-index"),
                document.getElementById("num-audio-bitrates"),
                document.getElementById("audio-buffer"),
                document.getElementById("audio-dropped-frames"),
                audioSeries
            );
        }

        bufferChart.setData([audioSeries, videoSeries]);
        bufferChart.setupGrid();
        bufferChart.draw();
    }

    setTimeout(update, graphUpdateInterval);
}

function handleVideoMetricsUpdate() {
    "use strict";
    var metrics = player.getMetricsFor("video"),
        metricsConverter = player.getMetricsConverter(),
        videoTreeDataSource;

    videoTreeDataSource = metricsConverter.toTreeViewDataSource(metrics);
    videoMetricsTreeView.data("kendoTreeView").setDataSource(videoTreeDataSource);
}

function handleAudioMetricsUpdate() {
    "use strict";
    var metrics = player.getMetricsFor("audio"),
        metricsConverter = player.getMetricsConverter(),
        audioTreeDataSource;

    audioTreeDataSource = metricsConverter.toTreeViewDataSource(metrics);
    audioMetricsTreeView.data("kendoTreeView").setDataSource(audioTreeDataSource);
}

function handleSourcesChange() {
    "use strict";
    var custom = $("#custom-source"),
        liveBox = $("#live-checkbox"),
        select = $("#sources"),
        streamObject;

    streamObject = streams[select.val()];

    custom.val(streamObject.url);

    if (streamObject.isLive) {
        liveBox.attr('checked','checked');
    } else {
        liveBox.removeAttr('checked');
    }
    setupLabel();
}

function initStreamData() {
    "use strict";
    streams = {};

    streams.sony_dp = {
        url: "http://dash.edgesuite.net/digitalprimates/sony/DISC1651343080050699_TEST_US_12_28_56_DASH/DASH_vod.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_heacc2_0_dream = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_2_0_with_video/ElephantsDream/elephants_dream_480p_heaac2_0.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_heacc2_0_sintel = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_2_0_with_video/Sintel/sintel_480p_heaac2_0.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_heacc5_1_6chId = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/6chId/6chId_480p_heaac5_1.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_heacc5_1_dream = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/ElephantsDream/elephants_dream_480p_heaac5_1.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_heacc5_1_sintel = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_5_1_with_video/Sintel/sintel_480p_heaac5_1.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_heacc7_1_8chId = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/heaac_7_1_with_video/8chId/8ch_id_480p_heaac7_1.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_mps5_0_6chId = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/mps_5_1_with_video/6chId/6chId_480p_mps5_1.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_mps5_0_dream = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/mps_5_1_with_video/ElephantsDream/elephants_dream_480p_mps5_1.mpd",
        isLive: false
    };

    streams.fraunhofer_480p_mps5_0_sintel = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/480p_video/mps_5_1_with_video/Sintel/sintel_480p_mps5_1.mpd",
        isLive: false
    };

    streams.fraunhofer_audio_only_dream = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/audio_only/heaac_2_0_without_video/ElephantsDream/elephants_dream_audio_only_heaac2_0.mpd",
        isLive: false
    };

    streams.fraunhofer_audio_only_sintel = {
        url: "http://dash.edgesuite.net/digitalprimates/fraunhofer/audio_only/heaac_2_0_without_video/Sintel/sintel_audio_only_heaac2_0.mpd",
        isLive: false
    };

    streams.ipvidnetLive = {
        url: "http://dash-live-path1.edgesuite.net/dash/manifest.mpd",
        isLive: true
    };

    streams.uspLive = {
        url: "http://live.unified-streaming.com/loop/loop.isml/loop.mpd?format=mp4&session_id=25020",
        isLive: true
    };

    streams.wowzaList = {
        url: "http://174.129.39.107:1935/live/myStream/manifest_mpm4sav_mvlist.mpd",
        isLive: true
    };

    streams.wowzaTemplate = {
        url: "http://174.129.39.107:1935/live/myStream/manifest_mpm4sav_mvnumber.mpd",
        isLive: true
    };

    streams.wowzaTimeline = {
        url: "http://174.129.39.107:1935/live/myStream/manifest_mpm4sav_mvtime.mpd",
        isLive: true
    };

    streams.thomsonLive = {
        url: "http://tvnlive.dashdemo.edgesuite.net/live/manifest.mpd",
        isLive: true
    };

    streams.mediaExcelLive1 = {
        url: "http://dashdemo.edgesuite.net/mediaexcel/live/ch1/dash.mpd",
        isLive: true
    };

    streams.mediaExcelLive2 = {
        url: "http://dashdemo.edgesuite.net/mediaexcel/live/ch2/dash.mpd",
        isLive: true
    };

    streams.microsoft1 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_MP4_from_WAME/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoft2 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoft3 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_720p_Main_Profile/sintel_trailer-720p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoft4 = {
        url: "http://origintest.cloudapp.net/media/MPTExpressionData01/ElephantsDream_1080p24_IYUV_2ch.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoft5 = {
        url: "http://origintest.cloudapp.net/media/MPTExpressionData02/BigBuckBunny_1080p24_IYUV_2ch.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoftCenc1 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_720p_Main_Profile_CENC/CENC/sintel_trailer-720p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoftCenc2 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_720p_Main_Profile_CENC/NoSubSampleAdjustment/sintel_trailer-720p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoftCenc3 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_720p_Main_Profile_CENC/NoSubSampleAdjustmentNoSenc/sintel_trailer-720p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoftCenc4 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_CENC/CENC/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoftCenc5 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_CENC/NoSubSampleAdjustment/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.microsoftCenc6 = {
        url: "http://origintest.cloudapp.net/media/SintelTrailer_Smooth_from_WAME_CENC/NoSubSampleAdjustmentNoSenc/sintel_trailer-1080p.ism/manifest(format=mpd-time-csf)",
        isLive: false
    };

    streams.archive = {
        url: "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/manifest.mpd",
        isLive: false
    };

    streams.live = {
        url: "http://dashdemo.edgesuite.net/mediaexcel/live/ch1/dash.mpd",
        isLive: true
    };

    streams.list = {
        url: "http://www.digitalprimates.net/dash/streams/gpac/mp4-main-multi-mpd-AV-NBS.mpd",
        isLive: false
    };

    streams.template = {
        url: "http://www.digitalprimates.net/dash/streams/mp4-live-template/mp4-live-mpd-AV-BS.mpd",
        isLive: false
    };

    streams.timeline = {
        url: "http://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.mpd",
        isLive: false
    };

    streams.base = {
        url: "http://www.digitalprimates.net/dash/streams/mp4-onDemand/mp4-onDemand-mpd-AV.mpd",
        isLive: false
    };

    streams.youtube = {
        url: "http://yt-dash-mse-test.commondatastorage.googleapis.com/car-20120827-manifest.mpd",
        isLive: false
    };

    streams.bunny = {
        url: "http://dash.edgesuite.net/adobe/bbb/bbb.mpd",
        isLive: false
    };

    streams.envivio = {
        url: "http://dash.edgesuite.net/envivio/dashpr/clear/Manifest.mpd",
        isLive: false
    };

    streams["1a-netflix"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/1a/netflix/exMPD_BIP_TC1.mpd",
        isLive: false
    };

    streams["1a-sony"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd",
        isLive: false
    };

    streams["1b-envivio"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/1b/envivio/manifest.mpd",
        isLive: false
    };

    streams["1b-thomson"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/1/manifest.mpd",
        isLive: false
    };

    streams["1c-envivio"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/1c/envivio/manifest.mpd",
        isLive: false
    };

    streams["2a-envivio"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/2a/envivio/manifest.mpd",
        isLive: false
    };

    streams["2a-sony"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/2a/sony/SNE_DASH_CASE_2A_SD_REVISED.mpd",
        isLive: false
    };

    streams["2a-thomson"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/2a/thomson-networks/1/manifest.mpd",
        isLive: false
    };

    streams["3a-fraunhofer"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/3a/fraunhofer/ed.mpd",
        isLive: false
    };

    streams["3b-fraunhofer"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/3b/fraunhofer/elephants_dream_heaac2_0.mpd",
        isLive: false
    };

    streams["3b-sony"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/3b/sony/SNE_DASH_CASE3B_SD_REVISED.mpd",
        isLive: false
    };

    streams["4b-sony"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/4b/sony/SNE_DASH_CASE4B_SD_REVISED.mpd",
        isLive: false
    };

    streams["5a-thomson/envivio"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/5a/1/manifest.mpd",
        isLive: false
    };

    streams["5b-thomson/envivio"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/5b/1/manifest.mpd",
        isLive: false
    };

    streams["6c-envivio1"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/6c/envivio/manifest.mpd",
        isLive: false
    };

    streams["6c-envivio2"] = {
        url: "http://dash.edgesuite.net/dash264/TestCases/6c/envivio/manifest2.mpd",
        isLive: false
    };
}

function initStreamSources( browserVersion ) {
    "use strict";
    var sourceOptions = $("#sources > option"),
        testChannel = false,
        filterValue;

    browserVersion = browserVersion.toLowerCase();

    switch( browserVersion )
    {
        case "beta":
            filterValue = "b";
            break;
        case "canary":
            filterValue = "c";
            break;
        case "dev":
            filterValue = "d";
            break;
        case "explorer":
            filterValue = "i";
            break;
        case "all":
            testChannel = true;
            break;
        case "stable":
        default:
            filterValue = "s";
            break;
    }

    if (testChannel === false) {
        sourceOptions.each(function (index, item) {
            var feeds = $(item).attr("data-channels");
            if (feeds.indexOf(filterValue) === -1) {
                $(item).remove();
            }
        });
    }
}

function initDebugControls() {
    "use strict";
    var debug;

    $("#debug-enabled-toggle").change(
        function() {
            debug = player.getDebug();
            debug.setLogToHtmlConsole($("#debug-enabled-toggle").attr("checked"));
        }
    );

    $("#debug-clear").click(
        function() {
            debug = player.getDebug();
            debug.clear();
        }
    );

    $("#filter-source").on("input",
        function() {
            debug = player.getDebug();
            debug.setFilter($("#filter-source").attr("value"));
        }
    );
}

function parseBrowserVersion( searchStr ) {
    var versionIndex,
        subSearchStr,
        ampIndex,
        equalIndex,
        result;

    if ( searchStr === null || searchStr.length === 0) {
        return "stable";
    }

    searchStr = searchStr.toLowerCase();
    versionIndex = searchStr.indexOf("version=");

    if (versionIndex === -1) {
        return "stable"
    }

    subSearchStr = searchStr.substr( versionIndex, searchStr.length );
    ampIndex = subSearchStr.indexOf("&");
    equalIndex = subSearchStr.indexOf("=");

    if (ampIndex === -1) {
        result = subSearchStr.substr((equalIndex + 1), subSearchStr.length);
    } else {
        result = subSearchStr.substr((equalIndex + 1), (ampIndex - equalIndex - 1));
    }

    return result;
}

function parseMpd( searchStr ) {
    var mpdIndex,
        subSearchStr,
        ampIndex,
        equalIndex,
        result;

    if ( searchStr === null || searchStr.length === 0) {
        return null;
    }

    searchStr = searchStr.toLowerCase();
    mpdIndex = searchStr.indexOf("mpd=");

    if (mpdIndex === -1) {
        return null;
    }

    subSearchStr = searchStr.substr( mpdIndex, searchStr.length );
    ampIndex = subSearchStr.indexOf("&");
    equalIndex = subSearchStr.indexOf("=");

    if (ampIndex === -1) {
        result = subSearchStr.substr((equalIndex + 1), subSearchStr.length);
    } else {
        result = subSearchStr.substr((equalIndex + 1), (ampIndex - equalIndex - 1));
    }

    if (result.length === 0) {
        return null;
    }

    return result;
}

function load() {
    "use strict";
    var input = $("#custom-source"),
        liveBox = $("#live-checkbox"),
        debug = player.getDebug(),
        url,
        isLive = false;

    url = input.val();
    isLive = liveBox.is(':checked');

    player.setIsLive(isLive);
    player.attachSource(url);
    debug.log("manifest = " + url + " | isLive = " + isLive);

    playing = true;

    if (bufferChart) {
        audioSeries.data = [];
        videoSeries.data = [];
        bufferChart.setData([audioSeries, videoSeries]);
        bufferChart.setupGrid();
        bufferChart.draw();
    }
}

$(document).ready(function() {
    "use strict";
    var defaultDataSource,
        browserVersion,
        specifiedMpd,
        mpdUrl = $("#custom-source"),
        video = document.querySelector(".dash-video-player video"),
        context = new Dash.di.DashContext(),
        console = document.getElementById("debug_log"),
        debug,
        lastChild = $("#debug-log-tab");

    browserVersion = parseBrowserVersion( location.search );
    specifiedMpd = parseMpd( location.search );

    initDebugControls();
    initStreamData();
    initStreamSources( browserVersion );
    handleSourcesChange();

    // JS input/textarea placeholder
    $("input, textarea").placeholder();

    $(".btn-group a").click(function() {
        $(this).siblings().removeClass("active");
        $(this).addClass("active");
    });

    // Disable link click not scroll top
    $("a[href='#']").click(function() {
        return false;
    });

    $("#debug-log-tab").show();
    $("#video-metrics-tree-tab").hide();
    $("#audio-metrics-tree-tab").hide();
    $("#release-notes-tab").hide();

    $("#debug-log-btn").click(function () {
        lastChild.hide();
        lastChild = $("#debug-log-tab");
        lastChild.show();
    });

    $("#video-metrics-btn").click(function () {
        lastChild.hide();
        lastChild = $("#video-metrics-tree-tab");
        lastChild.show();
    });

    $("#audio-metrics-btn").click(function () {
        lastChild.hide();
        lastChild = $("#audio-metrics-tree-tab");
        lastChild.show();
    });

    $("#release-notes-btn").click(function () {
        lastChild.hide();
        lastChild = $("#release-notes-tab");
        lastChild.show();
    });

    $("#informationTabs").tabs();
    $("#videoMetricsUpdateButton").button().click(handleVideoMetricsUpdate);
    $("#audioMetricsUpdateButton").button().click(handleAudioMetricsUpdate);

    defaultDataSource = new kendo.data.HierarchicalDataSource({
        data: [ {text: "No Data"} ]
    });

    videoMetricsTreeView = $("#videoMetricsTree").kendoTreeView({
        dataSource: defaultDataSource
    });

    audioMetricsTreeView = $("#audioMetricsTree").kendoTreeView({
        dataSource: defaultDataSource
    });

    $("#sources").dropkick({
        change: handleSourcesChange
    });

    setTimeout(update, graphUpdateInterval);

    player = new MediaPlayer(context);
    $("#version-number").text("version " + player.getVersion());

    player.startup();

    debug = player.debug;
    debug.init(console);

    player.autoPlay = true;
    player.attachView(video);

    if (specifiedMpd !== null) {
        mpdUrl.val(specifiedMpd);
        load();
    }
});