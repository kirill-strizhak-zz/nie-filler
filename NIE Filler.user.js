// ==UserScript==
// @name         NIE Filler
// @description  Script for NIE automatic form filling for the Barcelona area
// @namespace    https://sede.administracionespublicas.gob.es/
// @version      1.3
// @author       k.strizhak84@gmail.com
// @match        https://sede.administracionespublicas.gob.es/icpplustieb*
// @require      https://code.jquery.com/jquery-2.1.4.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    var NIE  = 0;
    var DNI  = 1;
    var PASS = 2;

    var APPLICANTS = [
        {
            name: "JANE MAY",
            docType: PASS,
            numberPrefix: "",
            number: "AB1234567",
            numPostfix: "",
            phone: "600111333",
            email: "email333@test.com",
            motive: "Trabajo"
        },{
            name: "JOHN DOE",
            docType: NIE,
            numPrefix: "X",
            number: "1111",
            numPostfix: "Y",
            phone: "600111111",
            email: "email111@test.com",
            motive: "Temporal, por 3 meses"
        },{
            name: "SAM SMITH",
            docType: DNI,
            numberPrefix: "",
            number: "12345678",
            numPostfix: "A",
            phone: "600111222",
            email: "email222@test.com",
            motive: "Temporal, por 3 meses"
        }
    ];

    var OPTIONS = {
        continue_on_captcha_enter     : true, // Automatically continue to the next page after pressing ENTER in captcha input.
        auto_retry_if_no_appointment  : true, // Automatically retry with the same person if there are no available appointments after an interval.
        auto_retry_interval_min       : 5,    // Interval in minutes, after which to retry finding an appointment.
        auto_select_office            : true, // Automatically select the first provided office for the appointment.
        auto_select_first_appointment : true, // Automatically select the first available appointment and advance.
        subscribe_to_email            : true, // On the verification page (Paso 4 de 5) put a tick beside "Deseo recibir un correo electrónico...".
        auto_advance_page_8           : true, // Automatically advance after confirming data on verification page (Paso 4 de 5).
    };

    var APPLICANT_LIST_STYLE = "background: yellow; position: absolute; top: 0; right: 0; padding: 3px;";

    var PAGE_1_BASE_URL   = "https://sede.administracionespublicas.gob.es/icpplustieb/citar";
    var PAGE_2_INFO       = "accion=ac_info";
    var PAGE_3_ENTRANCE   = "accion=ac_entrada";
    var PAGE_4_VALIDATE   = "accion=ac_validarentrada";
    var PAGE_5_SEARCH     = "accion=AC_CITAR";
    var PAGE_6_ADDITIONAL = "accion=AC_VERFORMULARIO"; // (Paso 2 de 5)
    var PAGE_7_OFFER      = "accion=AC_OFERTARCITA";   // (Paso 3 de 5)
    var PAGE_8_VERIFY     = "accion=AC_VERIFICARCITA"; // (Paso 4 de 5)

    var LOAD_WAIT_INTERVAL = 200;
    var RETRY_INT_MULTIPLYER = 60000;

    var SEL_CAPTCHA            = "#recaptcha_response_field";
    var SEL_P1_CERTIFICADOS_EU = "select[name='t']";
    var SEL_P1_ACCEPT          = "input[value='Aceptar']";
    var SEL_P2_ENTER           = "input[value='ENTRAR']";
    var SEL_P3_OPT_NIE         = "input[value='N.I.E.']";
    var SEL_P3_OPT_DNI         = "input[value='D.N.I.']";
    var SEL_P3_OPT_PASS        = "input[value='Pasaporte / Documento de identidad']";
    var SEL_P3_NUM_PREFIX      = "#txtLetraNie";
    var SEL_P3_NUMBER          = "#txtNieAux";
    var SEL_P3_NUM_POSTFIX     = "#txtLetraNieAux";
    var SEL_P3_NAME            = "#txtDesCitado";
    var SEL_P3_ACCEPT          = "input[value='Aceptar']";
    var SEL_P4_SOLICITAR       = "input[value='SOLICITAR CITA']";
    var SEL_P5_NO_APP          = "td:contains('no hay citas disponibles')";
    var SEL_P5_VOLVER          = "input[value='Volver']";
    var SEL_P5_SIGUENTE        = "input[value='Siguiente']";
    var SEL_P6_PHONE           = "#txtTelefonoCitado";
    var SEL_P6_EMAIL           = "#emailUNO";
    var SEL_P6_CONFIRM_EMAIL   = "#emailDOS";
    var SEL_P6_MOTIVE          = "#txtObservaciones";
    var SEL_P6_SIGUENTE        = "input[value='Siguiente']";
    var SEL_P7_CITA            = "input[title='Seleccionar CITA 1'";
    var SEL_P7_SIGUENTE        = "input[value='Siguiente']";
    var SEL_P8_CHB_CONFIRM     = "input[name='chkTotal']";
    var SEL_P8_SUBSCRIBE       = "#enviarCorreo";
    var SEL_P8_BTN_CONFIRM     = "input[value='Confirmar']";

    var RETRY_COUNTER_STYLE = "font-size: large; display: inline; vertical-align: middle; margin: 20px;";

    var BEEP_MP3 =
        "data:audio/mp3;base64,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" +
        "1MjczsJyzJuBu26lg6vDpm6ZtYIByrcoU50vwPYptqABBcHq6YgBiuPNy/DOmliA184Zme7u6zisO/3X450ctjEOQx9Ts7QQ8/ScKHKCF4wqnrkiCGQhvn4bhamGDl" +
        "/VF791CpwRjAGw6VV7vbmREdI4zWAihEUONSdirxaYeMLCOPS8wRpBp5J55qmQ49EMjBnWliU0yCFlCakA3/yptrftf9/131P3/1f9vV//YbBQaktjKREbOUw7Szsa" +
        "ZESaE5QdQdbYlE+tCfK5mfQXtHz5iTyHH8K6EhOFMANwBkWJXK5E4kDAIBAIBBRFGSJGcapmc8zPaqJUDDgUAgyVVW//tVVX/c0jP/9d5ye5GaeWp5IkdanntVZ39U" +
        "8t+8zJFH/zjkZntVf1r5OVVVrAyINPEQNBoGhKGlPDoKrBp5bYoOli3iWCtrOIg7TEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5" +
        "LErAASARMPLCR4im+tX8mHmThVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV" +
        "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV" +
        "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV" +
        "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV" +
        "VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

    if (window.location.href === PAGE_1_BASE_URL) {
        navigatePage1();

    } else if (window.location.href.indexOf(PAGE_2_INFO) != -1) {
        navigatePage2();

    } else if (window.location.href.indexOf(PAGE_3_ENTRANCE) != -1) {
        navigatePage3();

    } else if (window.location.href.indexOf(PAGE_4_VALIDATE) != -1) {
        navigatePage4();

    } else if (window.location.href.indexOf(PAGE_5_SEARCH) != -1) {
        navigatePage5();

    } else if (window.location.href.indexOf(PAGE_6_ADDITIONAL) != -1) {
        navigatePage6();

    } else if (window.location.href.indexOf(PAGE_7_OFFER) != -1) {
        navigatePage7();

    } else if (window.location.href.indexOf(PAGE_8_VERIFY) != -1) {
        navigatePage8();
    }

/*
    PAGE 1
*/
    function navigatePage1() {
        p1_setCertificadosEU();
    }

    function p1_setCertificadosEU() {
        var sel = $(SEL_P1_CERTIFICADOS_EU);
        waitForEl(
            sel, p1_setCertificadosEU, LOAD_WAIT_INTERVAL,
            function() {
                sel.val(22);
                triggerClick(SEL_P1_ACCEPT);
            }
        );
    }

/*
    PAGE 2
*/
    function navigatePage2() {
        triggerClick(SEL_P2_ENTER);
    }

/*
    PAGE 3
*/
    function navigatePage3() {
        p3_buildApplicantList();
        p3_selectApplicant();
        p3_registerAppSwitch();
        if (OPTIONS.continue_on_captcha_enter) {
            triggerAfterCaptcha(SEL_P3_ACCEPT);
        }
    }

    function p3_buildApplicantList() {
        var appDiv = $("<div/>", {
            id: "nief-person-div",
            style: APPLICANT_LIST_STYLE
        });
        $("body").append(appDiv);
        var persSel = $("<select/>", { id: "nief-person-sel" });
        appDiv.append(persSel);
        for (var i = 0; i < APPLICANTS.length; i++) {
            p3_addOption(persSel, i);
        }
        persSel.change(p3_selectApplicant);
    }

    function p3_addOption(root, appIdx) {
        var opt = $("<option/>", {
            value: appIdx,
            text: APPLICANTS[appIdx].name
        });
        root.append(opt);
    }

    function p3_selectApplicant() {
        var appIdx = $("#nief-person-sel").val();
        GM_setValue("appIdx", appIdx);
        var app = APPLICANTS[appIdx];

        if (app.docType === NIE) {
            $(SEL_P3_OPT_NIE).click();
        } else if (app.docType === DNI) {
            $(SEL_P3_OPT_DNI).click();
        } else if (app.docType === PASS) {
            $(SEL_P3_OPT_PASS).click();
        }

        $(SEL_P3_NUM_PREFIX).val(app.numPrefix);
        $(SEL_P3_NUMBER).val(app.number);
        $(SEL_P3_NUM_POSTFIX).val(app.numPostfix);
        $(SEL_P3_NAME).val(app.name);

        setFocus(SEL_CAPTCHA);
    }

    function p3_registerAppSwitch() {
        $("body").keyup(function(e) {
            if (e.altKey && e.which > 47 && e.which < 58) {
                var idx = (e.which === 48) ? 9 : e.which - 49;
                if (idx > APPLICANTS.length - 1) {
                    idx = APPLICANTS.length - 1;
                }
                var persSel = $("#nief-person-sel");
                var currIdx = persSel.val();
                if (currIdx != idx) {
                    persSel.val(idx);
                    p3_selectApplicant();
                }
            }
        });
    }

/*
    PAGE 4
*/
    function navigatePage4() {
        setFocus(SEL_CAPTCHA);
        if (OPTIONS.continue_on_captcha_enter) {
            triggerAfterCaptcha(SEL_P4_SOLICITAR);
        }
    }

/*
    PAGE 5
*/
    function navigatePage5() {
        var noApp = $(SEL_P5_NO_APP).length !== 0;
        if (noApp && OPTIONS.auto_retry_if_no_appointment) {
            var audio = $("<audio/>", { style: "display:none;" });
            var src = $("<source/>", { src: BEEP_MP3 });
            audio.append(src);
            $("body").append(audio);

            var display = $("<div/>", { style: RETRY_COUNTER_STYLE });
            var timePrefix = $("<span/>", { text: "Retrying in " });
            var time = $("<span/>", { text: OPTIONS.auto_retry_interval_min });
            var timePostfix = $("<span/>", { text: " minutes" });
            display.append(timePrefix);
            display.append(time);
            display.append(timePostfix);
            $(SEL_P5_VOLVER).after(display);

            setTimeout(p5_retry, OPTIONS.auto_retry_interval_min * RETRY_INT_MULTIPLYER, audio, time, 3);
            setTimeout(p5_updateRetryTime, RETRY_INT_MULTIPLYER, time);

        } else if (!noApp && OPTIONS.auto_select_office) {
            triggerClick(SEL_P5_SIGUENTE);
        }
    }

    function p5_retry(audio, time, beepCount) {
        audio.trigger("play");
        if (beepCount > 1) {
            console.log("beep");
            setTimeout(p5_retry, 1000, audio, time, beepCount - 1);
        } else {
            console.log("retry");
            time.text("0");
            setTimeout(function() { window.history.back(); }, 1000);
        }
    }

    function p5_updateRetryTime(time) {
        var timeVal = time.text() - 1;
        time.text(timeVal);
        if (timeVal > 1) {
            setTimeout(p5_updateRetryTime, RETRY_INT_MULTIPLYER, time);
        }
    }

/*
    PAGE 6 (Paso 2 de 5)
*/
    function navigatePage6() {
        var appIdx = GM_getValue("appIdx");
        var app = APPLICANTS[appIdx];
        $(SEL_P6_PHONE).val(app.phone);
        $(SEL_P6_EMAIL).val(app.email);
        $(SEL_P6_CONFIRM_EMAIL).val(app.email);
        $(SEL_P6_MOTIVE).val(app.motive);
        setFocus(SEL_CAPTCHA);
        if (OPTIONS.continue_on_captcha_enter) {
            triggerAfterCaptcha(SEL_P6_SIGUENTE);
        }
    }

/*
    PAGE 7 (Paso 3 de 5)
*/
    function navigatePage7() {
        if (OPTIONS.auto_select_first_appointment) {
            triggerClick(SEL_P7_CITA);
            triggerClick(SEL_P7_SIGUENTE);
        }
    }

/*
    PAGE 8 (Paso 4 de 5)
*/
    function navigatePage8() {
        triggerClick(SEL_P8_CHB_CONFIRM);
        if (OPTIONS.subscribe_to_email) {
            triggerClick(SEL_P8_SUBSCRIBE);
        }
        if (OPTIONS.auto_advance_page_8) {
            triggerClick(SEL_P8_BTN_CONFIRM);
        }
    }

/*
    COMMONS
*/
    function triggerAfterCaptcha(selector) {
        var cap = $(SEL_CAPTCHA);
        waitForEl(
            cap, triggerAfterCaptcha, LOAD_WAIT_INTERVAL,
            function() {
                cap.keydown(function(e) {
                    var code = e.which;
                    if (code == 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        $(selector).click();
                        return false;
                    }
                });
            },
            selector
        );
    }

    function triggerClick(selector) {
        var el = $(selector);
        waitForEl(el, triggerClick, LOAD_WAIT_INTERVAL, function() {  el.click(); }, selector);
    }

    function setFocus(selector) {
        var el = $(selector);
        waitForEl(el, setFocus, LOAD_WAIT_INTERVAL, function() { el.focus(); }, selector);
    }

    function waitForEl(el, waitTrigger, delay, elTrigger, selector) {
        if (el.length === 0) {
            setTimeout(waitTrigger, delay, selector);
        } else {
            elTrigger();
        }
    }
})();