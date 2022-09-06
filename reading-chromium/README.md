reading-chromium

# todo

- [ ] building
- [ ] testing
  - unit tests
    - blink
    - content
  - web tests
  - debugger
- [ ] blink (wip)
  - [ ] overview
  - [ ] layout
  - [ ] paint
  - [ ] style
  - [ ] dom
  - [ ] v8 integration
  - [ ] event loop
  - [ ] public api used by content
- [ ] content (wip)
  - content-shell
- [ ] chrome

- specifics
  - [ ] inline layout
  - [ ] img loading

# guides

- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/README.md
  - https://docs.google.com/document/d/1aitSOucL0VHZa9Z2vbRJSyAIsAz24kX8LFByQ5xQnUg
  - https://docs.google.com/presentation/d/1boPxbgNrTU0ddsc144rcXayGA_WF53k96imRH8Mp34Y

# hacking

- cf. [reading-v8](https://gist.github.com/hi-ogawa/637e1d95da20a522b7bae4c4401090db#hacking)

- for the efficient grep, set file filter pattern e.g. include = `./third_party/blink, ./content` and exclude = `*test.cc, *test.h`

- mojom syntax highlight https://github.com/JoelEinbinder/mojom-language

- `.vscode/settings.json`

```json5
{
  // https://github.com/fabiospampinato/vscode-open-in-github
  // git remote add origin-github git@github.com:chromium/chromium.git
  "openInGitHub.remote.name": "origin-github",
  "openInGitHub.remote.branch": "main",
  // https://github.com/hi-ogawa/vscode-extension-shell-shortcut 
  "hi-ogawa.shell-shortcut": {
    "commands": [
      {
        "name": "open source.chromium.org",
        "command": "filename=${__file__}; xdg-open \"https://source.chromium.org/chromium/chromium/src/+/main:${filename#*/src/};l=${__line__}\""
      }
    ]
  },
}  
```

## strategy

- look for "interesting" commit
  - guess by file name (e.g. `ng_flex_layout_algorithm.cc`)
  - go to github blame and find commits by "days ago" or "months ago"
  - criteria
    - fix fo some visible bugs
    - addition or update of tests


## building

- build on linux https://chromium.googlesource.com/chromium/src/+/main/docs/linux/build_instructions.md
- dependencies https://github.com/archlinux/svntogit-packages/blob/82f137aac737d1eaccffbd82c5d592d99832851a/trunk/PKGBUILD#L16-L20

```sh
# fetch source code
fetch --nohooks --no-history chromium
gclient runhooks

# generate build files
gn gen out/Default

# build
ninja -C out/Default blink_unittests blink_web_tests content_unittests content_shell # more than 40K targets

# generate compdb for vscode (see "editor" below)
ninja -C out/Default -t compdb cxx cc > out/Default/compile_commands.json

# list targets
ninja -C out/Default -t browse
ninja -C out/Default -t targets | sort -u | less

# debugging with lldb
lldb out/Default/blink_unittests -- --single-process-tests --gtest_filter=NGBlockLayoutAlgorithmTest.FixedSize

# run content_shell
./out/Default/content_shell https://github.com/hi-ogawa
```

## testing

- https://chromium.googlesource.com/chromium/src.git/+/HEAD/docs/testing/

```sh
# unit tests
./out/Default/blink_unittests --gtest_filter=NGInlineLayoutTest.BlockWithSingleTextNode

# web tests (https://chromium.googlesource.com/chromium/src.git/+/HEAD/docs/testing/writing_web_tests.md)
third_party/blink/tools/run_web_tests.py -t Default external/wpt/css/css-flexbox/flexbox-column-row-gap-001.html
```

## editor

- https://chromium.googlesource.com/chromium/src/+/master/docs/vscode.md
- https://chromium.googlesource.com/chromium/src/+/master/tools/vscode

### `.vscode/c_cpp_properties.json`

```json
{
  "version": 4,
  "configurations": [
    {
      "name": "Linux",
      "compilerPath": "${workspaceFolder}/third_party/llvm-build/Release+Asserts/bin/clang++",
      "compileCommands": "${workspaceFolder}/out/Default/compile_commands.json"
    }
  ]
}
```

### `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "blink_unittests",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/out/Default/blink_unittests",
      "args": ["--single-process-tests", "--gtest_filter=NGInlineLayoutTest.BlockWithSingleTextNode"],
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}",
      "environment": [],
      "externalConsole": false,
      "MIMode": "gdb",
      "setupCommands": [
        {
          "text": "-enable-pretty-printing"
        },
        {
          "text": "-interpreter-exec console \"source -v ${workspaceFolder}/tools/gdb/gdbinit\""
        },
        {
          "text": "-interpreter-exec console \"python import sys; sys.path.insert(0, '${workspaceFolder}/third_party/blink/tools/gdb'); import blink\""
        }
      ]
    }
  ]
}
```

### `.vscode/settings.json`

```jsonc
{
  // https://github.com/fabiospampinato/vscode-open-in-github
  // git remote add origin-github git@github.com:chromium/chromium.git
  "openInGitHub.remote.name": "origin-github",
  "openInGitHub.remote.branch": "main"
}
```

# overview

- parse
- layout
- paint
- event handling

# layout

- https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/layout/ng/README.md

- prerequisites
  - https://www.w3.org/TR/css-display-3/#glossary
    - box, block
    - formatting context
    - in-flow, out-of-flow

## example

- intersting commits
  - https://github.com/chromium/chromium/commit/507f7d4221a70712a010fd681f528b9ea4e20737
  - https://github.com/chromium/chromium/commit/41e3c7b9c782a2ea09d4207d1f78572e45b83f42

- unittests
  - `TEST_F(NGBlockLayoutAlgorithmTest, FixedSize)`
  - `TEST_F(LayoutNGTextCombineTest, RebuildLayoutTreeForDetails)`
  - `TEST_F(NGFlexLayoutAlgorithmTest, DevtoolsBasic)`
  - `TEST_F(NGInlineLayoutTest, BlockWithSingleTextNode)`

```
TEST_F(NGFlexLayoutAlgorithmTest, DevtoolsBasic)
  LayoutForDevtools =>
    SetBodyInnerHTML => ??
    UpdateAllLifecyclePhasesForTest => ??


TEST_F(NGInlineLayoutTest, BlockWithSingleTextNode)
  Node::GetLayoutObject then cast to LayoutBlockFlow
  ConstraintSpaceForElement (LayoutBlockFlow --> NGConstraintSpace)
  construct NGBlockNode with LayoutBlockFlow
  CalculateInitialFragmentGeometry (NGConstraintSpace, NGBlockNode --> NGFragmentGeometry)
  NGBlockLayoutAlgorithm::Layout => ...


NGBlockLayoutAlgorithm::Layout =>
  Layout (possibly with inline formatting context) =>
    # loop child NGLayoutInputNode via NGBlockChildIterator
      # branches based on the type (list marker, column, ruby, etc...)
      # if NGLayoutInputNode::IsOutOfFlowPositioned (e.g. absolute)
        HandleOutOfFlowPositioned => ??
      # for common case
        # if NGLayoutInputNode::CreatesNewFormattingContext
          HandleNewFormattingContext =>
            ComputeChildData (returns NGInflowChildData) => ??
            LayoutNewFormattingContext (returns NGLayoutResult) => ??
              NGExclusionSpace::AllLayoutOpportunities
              for each NGLayoutOpportunity
                CreateConstraintSpaceForChild
                # recursively layout child
                LayoutBlockChild => NGBlockNode::Layout =>
                  # check cache etc... then
                  LayoutWithAlgorithm => DetermineAlgorithmAndRun => CreateAlgorithmAndRun => NGLayoutAlgorithm::Layout => ...
                  FinishLayout => ??
            ??
        # else
          HandleInflow => ??
    FinishLayout => ??


# https://www.w3.org/TR/css-flexbox-1/#layout-algorithm
NGFlexLayoutAlgorithm::Layout =>
  LayoutInternal (returns NGLayoutResult) =>
    PlaceFlexItems =>
      ConstructAndAppendFlexItems => ??
      loop
        FlexLayoutAlgorithm::ComputeNextFlexLine => ??
        # if FlexLine::ResolveFlexibleLengths continue the loop
        # otherwise
          BuildSpaceForLayout
          NGBlockNode::Layout (recursively layout child)
      # then converting FlexLine to NGFlexLine
    GiveItemsFinalPositionAndSize => ??
    NGBoxFragmentBuilder::ToBoxFragment
  then re-layout for some cases??

# https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/layout/ng/inline/README.md
NGInlineNode::Layout =>
  PrepareLayoutIfNeeded => PrepareLayout =>
    CollectInlines =>
      NGInlineItemsBuilder
      CollectInlinesInternal =>
        loop through children of LayoutBlockFlow and create NGInlineItem
        e.g. via NGInlineItemsBuilder::AppendText/EnterInline/ExitInline/AppendAtomicInline
    SegmentText => ??
    ShapeTextIncludingFirstLine => ShapeText => ReusingTextShaper::Shape => HarfBuzzShaper::Shape => ?? (https://harfbuzz.github.io)
    AssociateItemsWithInlines => LayoutNGText::SetInlineItems
  NGInlineLayoutAlgorithm::Layout =>
    for each NGLayoutOpportunity
      NGLineBreaker::NextLine (returns NGLineInfo) =>
        BreakLine =>
          switch by NGInlineItemType e.g.
            HandleText =>
              # if auto_wrap_
                BreakText => ShapingLineBreaker::ShapeLine => ??
            HandleAtomicInline => NGBlockNode::LayoutAtomicInline => Layout => ...
        ComputeLineLocation
      PrepareBoxStates
      CreateLine => ??
      try next loop when this opportunity doesn't fit


#
# data structure
#

Node

NGBlockNode < NGLayoutInputNode

NGInlineNode < NGLayoutInputNode
  NGInlineNodeData < NGInlineItemsData

NGLayoutInputNode
  LayoutBox

LayoutBlockFlow < LayoutBlock < LayoutBox < LayoutBoxModelObject < LayoutObject

LayoutBox
  NGLayoutResultList

LayoutObject
  ComputedStyle
  Node

FlexLine
  FlexItemVectorView

NGFlexLine
  NGFlexItem

NGFragmentGeometry

NGConstraintSpace

NGBlockLayoutAlgorithm < NGLayoutAlgorithm

NGFlexLayoutAlgorithm
  FlexLayoutAlgorithm (internally relies on "legacy" implementation?)

NGLayoutAlgorithm
  # templates
  NGInputNodeType (e.g. NGBlockNode)
  NGBreakTokenType (e.g. NGBlockBreakToken)
  NGBoxFragmentBuilderType (e.g. NGBoxFragmentBuilder)

NGLayoutResult
  NGPhysicalFragment

#
# inline
#

LayoutNGText < LayoutText < LayoutObject

NGLineInfo
  NGInlineItemsData
  NGInlineItemResults

NGInlineItem
  ShapeResult
```

# blink in unittest

```
TEST_F(NGInlineLayoutTest, BlockWithSingleTextNode)
  SimTest::SetUp => WebViewHelper::Initialize => InitializeWithOpener =>
    InitializeWebView => WebView::Create => WebViewImpl::Create => new WebViewImpl => Page::CreateOrdinary
    WebLocalFrame::CreateMainFrame => WebLocalFrameImpl::CreateMainFrame =>
      instantiate WebLocalFrameImpl => instantiate LocalFrameClientImpl
      WebLocalFrameImpl::InitializeCoreFrame => InitializeCoreFrameInternal =>
        instantiate LocalFrame
        SetCoreFrame
        LocalFrame::Init
    TestWebFrameClient::Bind(WebLocalFrame)
    CreateFrameWidgetAndInitializeCompositing =>
      CreateFrameWidget (instantiate TestWebFrameWidget < WebFrameWidgetImpl with mojo setup) =>
        WebLocalFrame::InitializeFrameWidget => WebLocalFrameImpl::CreateFrameWidgetInternal => WebFrameWidgetImpl
      GetSynchronousSingleThreadLayerTreeSettings
      WebFrameWidgetImpl::InitializeCompositing => WidgetBase::InitializeCompositing =>
        make_unique LayerTreeView
        LayerTreeView::Initialize =>
          cc::LayerTreeHost::CreateThreaded/CreateSingleThreaded => new LayerTreeHost ...
        WidgetInputHandlerManager::Create
      WebFrameWidgetImpl::SetCompositorVisible
  SimRequest => SimNetwork::AddRequest
  LoadURL => frame_test_helpers::LoadFrameDontWait =>
    WebLocalFrameImpl::CommitNavigation =>
      FrameLoader::CommitNavigation =>
        MakeGarbageCollected<DocumentLoader>
        CommitDocumentLoader => DocumentLoader::CommitNavigation =>
          InitializeWindow =>
            MakeGarbageCollected<LocalDOMWindow>
            LocalFrame::SetDOMWindow
          LocalDOMWindow::InstallNewDocument =>
            DocumentInit::CreateDocument (switch by DocumentInit::Type e.g. MakeGarbageCollected<HTMLDocument> for Type::kHTML)
            Document::Initialize =>
              StyleResolver::StyleForViewport => InitialStyleForElement => ...
              LayoutObjectFactory::CreateView (intantiate LayoutNGView or LayoutView)
              LayoutView::SetStyle
              DocumentLifecycle::AdvanceTo(ocumentLifecycle::kStyleClean)
          StartLoadingResponse => CreateParserPostCommit =>
            Document::OpenForNavigation (returns DocumentParser) => ImplicitOpen => CreateParser (instantiate HTMLDocumentParser or XMLDocumentParser)
  SimRequestBase::Complete (writing test html) =>
    Write => ...
    Finish => StaticDataNavigationBodyLoader::Finish => ... =>
      DocumentLoader::BodyLoadingFinished (as WebNavigationBodyLoader::Client) => DocumentLoader::FinishedLoading =>
        HTMLDocumentParser::Finish => ... => HTMLDocumentParser::end =>
          HTMLTreeBuilder::Finished => HTMLConstructionSite::FinishedParsing => Document::FinishedParsing => Document::ImplicitClose =>
            Document::UpdateStyleAndLayout => LocalFrameView::UpdateStyleAndLayout => UpdateStyleAndLayoutInternal =>
              Document::UpdateStyleAndLayoutTreeForThisDocument =>
                Document::UpdateStyle => ??
              UpdateLayout => LocalFrameView::PerformLayout =>
                LayoutView::UpdateLayout => ???
  SimCompositor::BeginFrame => LayerTreeHost::CompositeForTest => SingleThreadProxy::CompositeImmediatelyForTest =>
    DoBeginMainFrame => LayerTreeHost::BeginMainFrame =>
      LayerTreeView::BeginMainFrame (as cc::LayerTreeHostClient) =>
        WidgetBase::BeginMainFrame (as LayerTreeViewDelegate) =>
          WebFrameWidgetImpl::BeginMainFrame (as WidgetBaseClient) => ...
    DoPainting => ??
    DoCommit => ??
  GetDocument (go through many indirection: WebViewHelper -> WebViewImpl -> Page -> LocalFrame -> LocalFrameClientImpl -> WebLocalFrameImpl -> LocalFrame => LocalDOMWindow => Document)
  ...


#
# data structure
#

SimTest (gtest class)
  WebViewHelper
    WebViewImpl < WebView
      Page (Persistent)
        Frame (cf. Page::SetMainFrame) (e.g. LocalFrame, RemoteFrame)
  TestWebFrameClient < WebLocalFrameClient
    WebLocalFrameImpl < WebLocalFrame
      LocalFrame (cf. WebLocalFrameImpl::SetCoreFrame)
      LocalFrameClientImpl < < LocalFrameClient < FrameClient
      WebFrameWidgetImpl
  TestWebViewClient < WebViewClient
  SimNetwork
    SimRequestBase
  SimCompositor
    cc::LayerTreeHost
      cc::LayerTreeHostClient (implemented by blink LayerTreeView)
      Proxy (SingleThreadProxy)

LocalFrame < Frame
  LocalDOMWindow < DOMWindow
    Document
  LocalFrameView
  FrameLoader
    DocumentLoader < WebNavigationBodyLoader::Client
      DocumentParser (e.g. HTMLDocumentParser)

WebFrameWidgetImpl < WidgetBaseClient (interface BeginMainFrame), WebFrameWidget (blink/public) < WebWidget (interface UpdateLifecycle)
  WidgetBase < LayerTreeViewDelegate
    LayerTreeView < cc::LayerTreeHostClient
      cc::LayerTreeHost

WebNavigationInfo

StaticDataNavigationBodyLoader < WebNavigationBodyLoader (blink/public)

#
# data structure (dom)
#

Document
  StyleEngine
    StyleResolver
  LayoutView (e.g. LayoutNGView)
  ResourceFetcher

LayoutView < LayoutBlockFlow < LayoutBlockFlow
```

# content shell

- `content/README.md`
- `content/public/README.md`
- `content/shell`
- `content/renderer`, `content/renderer/renderer_main.cc`
- `content/browseer`, `content/borwser/renderer_host`
- `content/common/renderer.mojom`, `content/common/renderer_host.mojom`
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/mojo/public/cpp/bindings/README.md#remote-and-pendingreceiver  

TODO

- invoke navigation from renderer host to renderer
- deubgging renderer process/thread

```
#
# browser process
#

# content/shell/app/shell_main.cc
main =>
  ShellMainDelegate
  content::ContentMain =>
    ContentMainRunner::Create => ContentMainRunnerImpl::Create
    RunContentProcess =>
      base::CommandLine::Init
      InitializeMojo => ??
      ContentMainRunnerImpl::Initialize =>
        ContentClientCreator::Create =>
          ShellMainDelegate::CreateContentClient (as ContentMainDelegate) => instantiate ShellContentClient
          SetContentClient (assigned to static global variable with corresponding getter `GetContentClient`)
          ContentClientInitializer::Set => 
            (depending on process_type) e.g. ShellMainDelegate::CreateContentBrowserClient, CreateContentRendererClient
      ContentMainRunnerImpl::Run =>
        (for browser process)
          RunBrowser => RunBrowserProcessMain =>
            # content/browser/browser_main.cc
            BrowserMain =>
              BrowserMainRunnerImpl::Create
              BrowserMainRunnerImpl::Initialize =>
                instantiate BrowserMainLoop
                BrowserMainLoop::Init => ShellContentBrowserClient::CreateBrowserMainParts (as ContentBrowserClient)
                BrowserMainLoop::CreateMainMessageLoop => new BrowserThreadImpl
                BrowserMainLoop::CreateStartupTasks (queue task e.g. BrowserMainLoop::PreMainMessageLoopRun)
              BrowserMainRunnerImpl::Run => BrowserMainLoop::RunMainMessageLoop
        (for other processes)
          RunOtherNamedProcessTypeMain => ??


BrowserMainLoop::PreMainMessageLoopRun =>
  ShellBrowserMainParts::PreMainMessageLoopRun (as BrowserMainParts) =>
    Shell::Initialize => ShellPlatformDelegate::Initialize (e.g. aura) =>
      instantiate ShellPlatformDataAura => aura::WindowTreeHost::Create
    InitializeMessageLoopContext =>
      GetStartupURL (get initial page url from command line with fallback "https://www.google.com/")
      Shell::CreateNewWindow =>
        WebContents::Create => ...
        Shell::CreateShell =>
          new Shell
          ShellPlatformDelegate::CreatePlatformWindow => ShellPlatformDataAura::ResizeWindow
          ShellPlatformDelegate::SetContents => aura::Window::Show
        Shell::LoadURL => ...


WebContents::Create => WebContentsImpl::Create => CreateWithOpener =>
  new WebContentsImpl
  WebContentsImpl::Init => 
    SiteInstance::Create => SiteInstanceImpl::Create =>
      new BrowsingInstance
      new SiteInstanceImpl
    FrameTree::Init =>
      RenderFrameHostManager::InitRoot =>
        CreateRenderFrameHost =>
          FrameTree::CreateRenderViewHost => RenderViewHostFactory::Create
          RenderFrameHostFactory::Create
        SetRenderFrameHost
    CreateWebContentsView => ??
    WebContentsView::CreateView => ??


#
# renderer host
#

SiteInstanceImpl::GetProcess =>
  RenderProcessHostImpl::GetProcessHostForSiteInstance =>
    RenderProcessHostImpl::CreateRenderProcessHost =>
      new RenderProcessHostImpl => 
        RenderProcessHostImpl::InitializeChannelProxy =>
          IPC::ChannelProxy::GetRemoteAssociatedInterface (for mojom::Renderer from renderer process)
    RenderProcessHostImpl::Init =>
      RegisterMojoInterfaces
      mojom::Renderer::InitializeRenderer (queueing `RenderThreadImpl::InitializeRenderer` in renderer process in the future?)
      instantiate ChildProcessLauncher (actually spawn process?)
  SetProcessInternal =>
    SiteInstanceGroupManager::GetOrCreateGroupForNewSiteInstance => new SiteInstanceGroup


Shell::LoadURL => LoadURLForFrame => LoadURLWithParams => NavigationControllerImpl::LoadURLWithParams => NavigateWithoutEntry =>
  CreateNavigationEntryFromLoadParams => ??
  CreateNavigationRequestFromLoadParams => ??
  Navigator::Navigate =>
    NavigationRequest::BeginNavigation => BeginNavigationImpl =>
      CheckContentSecurityPolicy
      StartNavigation => ??
      WillStartRequest =>
        NavigationThrottleRunner::ProcessNavigationEvent(NavigationThrottleRunner::Event::WillStartRequest) => InformDelegate(NavigationThrottle::PROCEED) =>
          NavigationRequest::OnNavigationEventProcessed (as NavigationThrottleRunner::Delegate) =>
            OnWillStartRequestProcessed => OnStartChecksComplete => 
              instantiate ServiceWorkerMainResourceHandle
              extra manipulation e.g. for devtools, embedders, etc...
              NavigationURLLoader::Create => instantiate NavigationURLLoaderImpl =>
                ContentBrowserClient::WillCreateURLLoaderFactory (extra customizatoin for embedder)
                CreateURLLoaderFactoryWithHeaderClient =>
                  StoragePartitionImpl::GetNetworkContext
                  network::NetworkContext::CreateURLLoaderFactory (via mojo) => ...
              NavigationURLLoaderImpl::Start => StartImpl =>
                CreateInterceptors =>
                  ServiceWorkerMainResourceLoaderInterceptor::CreateForNavigation
                  content::PrefetchURLLoaderInterceptor::MaybeCreateInterceptor
                Restart =>
                  instantiate network::mojom::URLResponseHead
                  MaybeStartLoader =>
                    blink::ThrottlingURLLoader::CreateLoaderAndStart =>
                      new ThrottlingURLLoader
                      ThrottlingURLLoader::Start => StartNow => SharedURLLoaderFactory::CreateLoaderAndStart (TODO: who's impl?)


network::URLLoader::SendResponseToClient =(mojo)=> NavigationURLLoaderImpl::OnReceiveResponse (as network::mojom::URLLoaderClient) => CallOnReceivedResponse => 
  NotifyResponseStarted => NavigationRequest::OnResponseStarted (as NavigationURLLoaderDelegate) =>
    EnforceCOOP, EnforceCOEP
    RenderFrameHostManager::GetFrameHostForNavigation (returns RenderFrameHostImpl)
    WillProcessResponse => ProcessNavigationEvent =>
      NavigationThrottleRunner::ProcessNavigationEvent(NavigationThrottleRunner::Event::WillProcessResponse) => ... =>
        NavigationRequest::OnNavigationEventProcessed => OnWillProcessResponseProcessed =>
          OnWillProcessResponseChecksComplete =>
            RunCommitDeferringConditions =>
              CommitDeferringConditionRunner::ProcessChecks => ... =>
                NavigationRequest::OnCommitDeferringConditionChecksComplete (as CommitDeferringConditionRunner::Delegate) =>
                  CommitNavigation => RenderFrameHostImpl::CommitNavigation =>
                    # if same document
                      mojom::Frame::CommitSameDocumentNavigation => ... (TODO: who's impl on renderer?)
                    # otherwise
                      SendCommitNavigation =>
                        mojom::NavigationClient::CommitNavigation => ... (TODO: who's impl on renderer?)


?? => 
  AgentSchedulingGroupHost::SetUpIPC =>
    CreateAgentSchedulingGroup (to remote interface mojom::Renderer)


#
# renderer process
#

# content/renderer/renderer_main.cc
RendererMain =>
  blink::Platform::InitializeBlink
  RenderProcessImpl::Create => new RenderProcessImpl (v8 flag setup)
  new RenderThreadImpl =>
    ChildThreadImpl::Init (mojo initialization e.g. mojo::PendingRemote<mojom::ChildProcessHost>)
    RenderThreadImpl::Init =>
      viz::Gpu::Create (cf. viz::mojom::Gpu)
      InitializeWebKit =>
        instantiate RendererBlinkPlatformImpl
        # third_party/blink/renderer/controller/blink_initializer.cc
        blink::Initialize =>
          Platform::InitializeMainThread
          InitializeCommon =>
            ModulesInitializer::Initialize (as BlinkInitializer) =>
              CoreInitializer::Initialize => ...
            V8Initializer::InitializeMainThread
  RunLoop::Run

RenderThreadImpl::CreateAgentSchedulingGroup (as mojom::Renderer) => ??

?? => AgentSchedulingGroup::CreateWebView =>
  RenderFrameImpl::CreateMainFrame => ??


#
# data structure
#

BrowserMainRunnerImpl
  BrowserMainLoop
    BrowserThreadImpl

ShellMainDelegate < ContentMainDelegate
  ShellContentClient < ContentClient
  ShellContentBrowserClient  < ContentBrowserClient
  ShellContentRendererClient < ContentRendererClient

ContentClient
  ContentBrowserClient
  ContentRendererClient

ShellPlatformDelegate (e.g. content/shell/browser/shell_platform_delegate_aura.cc)

Shell < WebContentsDelegate
  WebContents

WebContentsImpl < WebContents, NavigationControllerDelegate, ...
  FrameTree
    Navigator
      NavigationControllerImpl (cf. WebContentsImpl::GetController)
        NavigationEntryImpl < NavigationEntry (stack of navigation entries?)
    FrameTreeNode (one for root)
      RenderFrameHostManager
        RenderFrameHostImpl
          RenderViewHostImpl

NavigationRequest < NavigationHandle, NavigationThrottleRunner::Delegate, NavigationURLLoaderDelegate
  NavigationState
  NavigationURLLoaderImpl < NavigationURLLoader, network::mojom::URLLoaderClient
    network::ResourceRequest
    network::SharedURLLoaderFactory
    network::mojom::URLLoader (response_url_loader_)
    blink::ThrottlingURLLoader < network::mojom::URLLoaderClient
  NavigationThrottleRunner
    NavigationThrottle (public)
  blink::mojom::CommitNavigationParamsPtr
  
SiteInstanceImpl < SiteInstance
  BrowsingInstance
  SiteInstanceGroup
    RenderProcessHostImpl < RenderProcessHost
    AgentSchedulingGroupHost

RenderProcessHostImpl < mojom::RendererHost, RenderProcessHost < IPC::Sender
  mojo::AssociatedRemote<mojom::Renderer>

RenderThreadImpl < mojom::Renderer, ChildThreadImpl < IPC::Listener

RendererBlinkPlatformImpl < BlinkPlatformImpl < blink::Platform

RenderFrameImpl < mojom::Frame, blink::WebLocalFrameClient
```

# old notes

- https://github.com/hi-ogawa/blog/blob/master/src/posts/2017-02-07-blink-overview.md
- https://github.com/hi-ogawa/blog/blob/master/src/posts/2017-02-26-blink-overview-vol-2-scratch.md
- https://github.com/hi-ogawa/blog/blob/master/src/posts/2017-02-28-blink-layout-code-reading-around-height-calcualtion.md
- https://github.com/hi-ogawa/blog/blob/master/src/posts/2017-03-03-blink-overview--vol-3-.md
- https://github.com/hi-ogawa/blog/blob/master/src/posts/2017-03-05-chromium-graphics.md
