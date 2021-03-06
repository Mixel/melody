/*
# Movable Type (r) Open Source (C) 2001-2010 Six Apart, Ltd.
# This program is distributed under the terms of the
# GNU General Public License, version 2.
#
# $Id$
*/

App.singletonConstructor =
MT.App = new Class( MT.App, {

    initEditor: function() {
        if ( this.constructor.Editor && DOM.getElement( "editor-content" ) ) {
            
            var mode = DOM.getElement( "convert_breaks" );
            DOM.addEventListener( mode, "change", this.getIndirectEventListener( "setTextareaMode" ) );
        
            /* special case */
            window.cur_text_format = mode.value;
        
            this.editorMode = ( mode.value == "richtext" ) ? "iframe" : "textarea";
            
            this.editor = this.addComponent( new MT.App.Editor( "editor-content", this.editorMode ) );
            this.editor.textarea.setTextMode( mode.value );
        
            this.editorInput = {
                content: DOM.getElement( "editor-input-content" ),
                extended: DOM.getElement( "editor-input-extended" )
            };
        
            if ( this.editorInput.content.value )
                this.editor.setHTML( this.editorInput.content.value );
        }
    }

} );


MT.App.Editor = new Class( Editor, {
    

    setChanged: function() {
        this.changed = true;
        log('changed');
        app.setDirty();
    }


} );
    
    
MT.App.Editor.Toolbar = new Class( Editor.Toolbar, {
        

    eventClick: function( event ) {
        var command = this.getMouseEventCommand( event );
        if ( !command )
            return event.stop();

        switch( command ) {

            case "insertEmail":
                var link = this.editor.getSelectedLink();
                if ( link ) 
                    this.editEmail( link );
                else 
                    this.createEmailLink();
                break;

            case "openDialog":
                app.openDialog( event.commandElement.getAttribute( "mt:dialog-params" ) );
                break;

            case "openFlyout":
                var name = event.commandElement.getAttribute( "mt:flyout" );
                var el = DOM.getElement( name );
                if ( !defined( el ) )
                    return;

                app.closeFlyouts( event.target );

                DOM.removeClassName( el, "hidden" );
                app.targetElement = event.target;
                app.applyAutolayouts( el );
                app.targetElement = null;

                app.openFlyouts.add( name );

                break;

            default:
                return arguments.callee.applySuper( this, arguments );
        
        }

        return event.stop();
    },
    
    
    editEmail: function( linkElement ) {
        this.createEmailLink( linkElement.href, true, linkElement );
    },


    mailtoRegexp: /^mailto:/i,

    createEmailLink: function( url, textSelected, anchor ) {
        var linkedText = "";
        if( !textSelected )
            textSelected = this.editor.isTextSelected();
        if( !url )
            url = "";

        url = url.replace( this.mailtoRegexp, "" );

        url = prompt( Editor.strings.enterEmailAddress, url );
        if( !url )
            return false;
        if( !textSelected ) 
            linkedText = prompt( Editor.strings.enterTextToLinkTo, "" ); 

        this.insertLink( { url: "mailto:" + url, linkedText: linkedText, anchor: anchor } );
    }


} );


MT.App.Editor.Textarea = new Class( Editor.Textarea, {

    currentTextMode: "_DEFAULT_",
    

    getHTML: function() {
        /* we can refocus the last selected element,
         * because the superClass getHTML will focus the editor (if IE) */
        var refocus;
        if ( document.activeElement )
            refocus = document.activeElement;
        
        var html = arguments.callee.applySuper( this, arguments );
        
        try { if ( refocus ) refocus.focus(); } catch(e) { };

        return html;
    },


    setTextMode: function( mode ) {
        var editorContent = DOM.getElement( "editor-content" );
        DOM.removeClassName( editorContent, /^editor-textmode-.*/ );
        if ( this[ mode + "Command" ] )
            DOM.addClassName( editorContent, "editor-textmode-" + mode.replace( /_/g, "-" ) );
        this.currentTextMode = mode;
    },


    execCommand: function( command, userInterface, argument ) {
        if ( this.currentTextMode && this[ this.currentTextMode + "Command" ] ) {
            log('executeing command: ' + command + ' in mode: '+this.currentTextMode );
            this[ this.currentTextMode + "Command" ].apply( this, arguments );
            return;
        }

        var text = this.getSelectedText();
        if ( !defined( text ) )
            text = '';
        switch ( command ) {
            
            case "fontSizeSmaller":
                this.setSelection( "<small>" + text + "</small>" );
                break;

            case "fontSizeLarger":
                this.setSelection( "<big>" + text + "</big>" );
                break;
    
            default:
                arguments.callee.applySuper( this, arguments );
                break;        
        }
    },
    


    "markdown_with_smartypantsCommand": function() {
        this.markdownCommand.apply( this, arguments );
    },


    markdownCommand: function( command, userInterface, argument ) {
        var text = this.getSelectedText();
        if ( !defined( text ) )
            text = '';
        switch ( command ) {
            
            case "bold":
                this.setSelection( "**" + text + "**" );
                break;

            case "italic":
                this.setSelection( "*" + text + "*" );
                break;

            case "createLink":
                this.setSelection( "[" + text + "](" + argument + ")" );
                break;
            
            case "indent":
                var list = text.split( /\r?\n/ );
                for ( var i = 0; i < list.length; i++ )
                    list[ i ] = "> " + list[ i ];
                this.setSelection( list.join( "\n" ) );
                break;
            
            case "insertUnorderedList":
            case "insertOrderedList":
                var list = text.split( /\r?\n/ );
                var ordered = ( command == "insertOrderedList" ) ? true : false;
                for ( var i = 0; i < list.length; i++ )
                    list[ i ] = " " + ( ordered ? ( ( i + 1 ) + ". " ) : "-" ) + " " + list[ i ];
                this.setSelection( "\n" + list.join( "\n" ) + "\n" );
                break;
        }
    },


    "textile_2Command": function( command, userInterface, argument ) {
        var text = this.getSelectedText();
        if ( !defined( text ) )
            text = '';
        switch ( command ) {
            
            case "bold":
                this.setSelection( "**" + text + "**" );
                break;

            case "italic":
                this.setSelection( "_" + text + "_" );
                break;

            case "strikethrough":
                this.setSelection( "-" + text + "-" );
                break;
            
            case "createLink":
                this.setSelection( '"' + text + '":' + argument );
                break;
            
            case "indent":
                this.setSelection( "bq. " + text );
                break;
            
            case "underline":
                this.setSelection( "<u>" + text + "</u>" );
                break;
            
            case "insertUnorderedList":
            case "insertOrderedList":
                var list = text.split( /\r?\n/ );
                var ordered = ( command == "insertOrderedList" ) ? true : false;
                for ( var i = 0; i < list.length; i++ )
                    list[ i ] = ( ordered ? "#" : "*" ) + " " + list[ i ];
                this.setSelection( "\n" + list.join( "\n" ) + "\n" );
                break;

            case "justifyLeft":
                this.setSelection( "p< " + text );
                break;

            case "justifyCenter":
                this.setSelection( "p= " + text );
                break;

            case "justifyRight":
                this.setSelection( "p> " + text );
                break;
            
            case "fontSizeSmaller":
                this.setSelection( "<small>" + text + "</small>" );
                break;

            case "fontSizeLarger":
                this.setSelection( "<big>" + text + "</big>" );
                break;
        }
    }

} );
