import React, { Component } from 'react'
import { createHar } from 'swagger2har'
import { CodeSnippetWidget } from 'react-apiembed'

export default class AugmentingResponses extends Component {
  state = {
    overlay: 'on'
  }

  shouldComponentUpdate (nextProps, nextState) {
    // BUG: props.tryItOutResponse is always coming back as a new Immutable instance
    const render = this.props.tryItOutResponse !== nextProps.tryItOutResponse ||
      this.props.responses !== nextProps.responses ||
      this.props.produces !== nextProps.produces ||
      this.props.producesValue !== nextProps.producesValue ||
      this.props.displayRequestDuration !== nextProps.displayRequestDuration ||
      this.props.path !== nextProps.path ||
      this.props.method !== nextProps.method ||
      this.state.overlay !== nextState.overlay

    return render
  }

  handleClose () {
    this.setState({ overlay: '' })
  }

  render () {
    const {
      system,
      specSelectors,
      path,
      method,
      getConfigs
    } = this.props
    const spec = specSelectors.specJson().toJS()
    const scheme = specSelectors.operationScheme() || 'http'
    const host = specSelectors.host() || 'example.com'
    const basePath = specSelectors.basePath() || ''
    const mutatedRequest = specSelectors.mutatedRequestFor(path, method)

    let selectedServer = system.oas3Selectors.selectedServer()

    if (selectedServer) {
      if (selectedServer.startsWith('/')) {
        selectedServer = window.location.origin + selectedServer
      } else if (!selectedServer.startsWith('http://') && !selectedServer.startsWith('https://')) {
        selectedServer = window.location.origin + window.location.pathname + '/' + selectedServer
      }
    }

    const har = createHar(spec, path, method, selectedServer || `${scheme}://${host}${basePath}`)

    if (mutatedRequest) {
      let mutatedRequest = specSelectors.mutatedRequestFor(path, method)

      mutatedRequest = mutatedRequest.toJS()

      // url
      har.url = mutatedRequest.url
      har.queryString = []

      // body
      if (mutatedRequest.body) {
        har.postData = har.postData || {}
        try {
          const parsed = typeof mutatedRequest.body === 'string'
            ? JSON.parse(mutatedRequest.body)
            : mutatedRequest.body

          har.postData.jsoObj = parsed
          har.postData.text = JSON.stringify(parsed)
        } catch (e) {
          // catch probably means xml
          har.postData.jsoObj = undefined
          // TODO fix clean up
          // this is probably bad practice and will screw over people to want new lines in their xml
          har.postData.text = mutatedRequest.body.replace(/\n|\t/g, '')
        }
      }

      // headers
      har.headers = Object.keys(mutatedRequest.headers).map(headerkey => {
        return {
          name: headerkey,
          value: mutatedRequest.headers[headerkey]
        }
      })

      this.setState({ overlay: '' })
    } else {
      // for some reason for scheme host basePath urls we sometimes get function header values instead of string
      // CodeSnippets only wants string headers ¯\_(ツ)_/¯
      har.headers.forEach(header => {
        if (typeof header.value !== 'string') {
          header.value = ''
        }
      })

      // replace '{' '}' delimiters which render escaped in a codesnippet context with ':'
      har.url = har.url.replace(/{/g, ':').replace(/}/g, '')
    }

    let languages
    const config = getConfigs()

    if (config.theme && config.theme.languages) {
      languages = config.theme.languages
    } else {
      languages = [
        {
          prismLanguage: 'bash',
          target: 'shell',
          client: 'curl'
        },
        {
          prismLanguage: 'javascript',
          target: 'javascript',
          client: 'xhr'
        },
        {
          prismLanguage: 'python',
          target: 'python'
        },
        {
          prismLanguage: 'ruby',
          target: 'ruby'
        }
      ]
    }

    return (
      <div className={'code-snippet'}>
        <p>CodeSnippettesting</p>
        { !mutatedRequest &&
          <div className={`overlay ${this.state.overlay}`}>
            <span className='close' onClick={() => this.handleClose()}>x</span>
            <h3>Use &apos;Try it Out&apos; to see completed code snippet</h3>
          </div>
        }
        <CodeSnippetWidget har={har} snippets={languages}/>
      </div>
    )
  }
}
