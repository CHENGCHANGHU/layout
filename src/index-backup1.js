import {
  query,
  createElement,
  getElementIndex,
  traverse,
  gene,
  clone,
  createElementString,
} from './base.js';

window.addEventListener('load', main);

const SymbolID = Symbol('id');
const compositeDataMap = new Map();
const EmptyCompositeData = {
  tag: 'div',
  text: 'placeholder',
  attributes: {
    'data-role': 'placeholder',
    'data-belong': 'root',
    style: `width: 100%;height: 100%;`,
  },
};
const selectedIDs = [];
const MaterialJSONMap = new Map();

let compositeBox = null;
let compositeContainer = null;
let attributeContainer = null;
let styleContainer = null;
let materialContainer = null;

let compositeData = EmptyCompositeData;
let defaultHeaderFixed = true;
let parasitized = true;
let displayText = '';
let newCustomMaterialName = '';
let newCustomMaterialJSON = '';

function addMaterial(id, name, json) {
  MaterialJSONMap.set(id, json);
  materialContainer.append(createElement({
    tag: 'div',
    text: name,
    attributes: {
      'data-role': 'material',
      'data-material-type': 'new-custom',
      'data-material-id': id,
      classes: 'material',
      draggable: true,
    },
  }));
}

const functions = {
  handleAddMaterial: () => {
    addMaterial(getId(), newCustomMaterialName, newCustomMaterialJSON);
  },
  handleSaveAsMaterial: (target) => {
    const materialId = getId();
    const { dataset: { id } } = target;
    const materialName = document.getElementById(`${id}-material-name`).value;
    const copiedOptions = clone(compositeDataMap.get(id).options);
    const convertedOptions = convertTobePlaceholder(getBone(copiedOptions));
    addMaterial(materialId, materialName, JSON.stringify(convertedOptions));
  },
};

function convertTobePlaceholder(options) {
  const { attributes, children } = options;
  if (attributes
    && /(tobe_)+placeholder/.test(attributes['data-role'])
  ) {
    attributes['data-role'] = attributes['data-role'].slice(5);
  }

  if (Array.isArray(children)) {
    children.forEach(convertTobePlaceholder);
  }

  return options;
}

function main() {
  console.log('Layout startup!');

  materialContainer = query('.material-container');
  compositeBox = query('.composite-box');
  compositeContainer = query('.composite-container');
  attributeContainer = query('.attribute-container');
  styleContainer = query('.style-container');

  renderCompositeColumn(compositeContainer, compositeData);

  document.addEventListener('click', event => {
    const { target } = event;
    const { dataset: { action } } = target;
    if (functions[action]) {
      functions[action](target);
      return;
    }
    switch (target.dataset.action) {
      case 'update':
        renderCompositeColumn(compositeContainer, compositeData);
        break;
      case 'delete':
        handleDelete(target.parentElement.parentElement, compositeContainer);
        break;
      case 'copy':
        handleCopy();
        break;
      default:
        break;
    }
    if (target.dataset.role === 'parasite'
      && (target.dataset.parasite === 'wrapper'
        || target.parentElement.dataset.parasite === 'wrapper')
    ) {
      const { options } = compositeDataMap.get(target.dataset.id);
      renderAttribute(options);
    }
  });

  document.addEventListener('change', event => {
    const { target } = event;
    const { value, dataset: { role } } = target;
    switch (target.dataset.parasite) {
      case 'element-select-checkbox':
        handleSelectCheck(target);
        break;
      case 'header-fixed-checkbox':
        document.getElementById(`${target.dataset.id}-wrapper`).dataset.headerFixed = target.checked;
        traverse(compositeData, (node) => {
          if (node.attributes
            && node.attributes['id'] === `${target.dataset.id}-wrapper`
          ) {
            node.attributes['data-header-fixed'] = target.checked;
          }
        });
        break;
    }
    switch (target.dataset.id) {
      case 'default-select':
        defaultHeaderFixed = target.checked;
        break;
      case 'composite-type':
        handleChangeCompositeType(target, compositeContainer);
        break;
      case 'parasite-select':
        parasitized = target.checked;
        renderCompositeColumn(compositeContainer, compositeData, {
          type: compositeBox.dataset.compositeType,
        });
        break;
    }
    switch (target.dataset.role) {
      case 'attribute-input':
        updateAttribute(target);
        renderCompositeColumn(compositeContainer, compositeData);
        return;
      case 'material-name-input':
        newCustomMaterialName = value;
        return;
      case 'material-json-input':
        newCustomMaterialJSON = value;
        return;
    }
  });

  document.addEventListener('dragstart', event => {
    const { target } = event;
    const { dataset: { materialType, materialId }, innerText } = target;
    const transferBase = {
      materialType,
    };
    switch (target.dataset.materialType) {
      case 'block':
      case 'flex':
      case 'grid':
        event.dataTransfer.setData('json', JSON.stringify({
          ...transferBase,
        }));
        break;
      case 'custom':
        event.dataTransfer.setData(
          'json',
          JSON.stringify({
            ...transferBase,
            tag: 'div',
            text: innerText,
            attributes: {
              'data-test': 'test-attribute',
            },
          }),
        );
        break;
      case 'custom-ul':
        event.dataTransfer.setData(
          'json',
          JSON.stringify({
            ...transferBase,
            tag: 'ul',
            attributes: {
              style: 'padding-left: 24px;box-size: border-box;'
            },
            children: [
              {
                tag: 'li',
                text: 'li 1',
              },
              {
                tag: 'li',
                text: 'li 2',
              },
              {
                tag: 'li',
                text: 'li 3',
              },
            ],
          }),
        );
        break;
      case 'custom-element':
        event.dataTransfer.setData(
          'json',
          JSON.stringify({
            ...transferBase,
            tag: 'custom-element',
            text: 'custom-element',
            attributes: {
              ':value': 'test value',
              style: 'display: block;',
            },
          }),
        );
        break;
      case 'new-custom':
        if (!MaterialJSONMap.has(materialId)) {
          return;
        }
        event.dataTransfer.setData(
          'json',
          JSON.stringify({
            ...transferBase,
            ...JSON.parse(MaterialJSONMap.get(materialId)),
          }),
        );
        return;
      case 'placeholder':
        event.dataTransfer.setData(
          'json',
          JSON.stringify({
            ...transferBase,
            tag: 'div',
            text: 'placeholder',
            attributes: {
              'data-role': 'tobe_placeholder',
              'data-belong': 'material',
              'data-place-type': 'inplace',
            },
          }),
        );
        return;
      default:
        break;
    }
  });

  // 只允许placeholder被放置material
  document.addEventListener("dragenter", (event) => {
    const { target } = event;
    if (target.dataset.role === 'placeholder') {
      event.preventDefault();
    }
  });
  
  // 只允许placeholder被放置material
  document.addEventListener("dragover", (event) => {
    const { target } = event;
    if (target.dataset.role === 'placeholder') {
      event.preventDefault();
    }
  });

  document.addEventListener('drop', event => {
    const { target, dataTransfer } = event;
    const {
      parentElement,
      dataset: { belong, place, placeType },
    } = target;
    const transferData = {
      id: getId(),
      ...JSON.parse(dataTransfer.getData('json')),
    };
    const parentElementData = compositeDataMap.get(parentElement.parentElement[SymbolID]);
    switch (belong) {
      case 'root':
        compositeData = getWrappedElement(getElementOptions(transferData));
        renderCompositeColumn(compositeContainer, compositeData);
        break;
      case 'block':
      case 'flex':
      case 'grid':
        parentElementData.options.children[1].children
          .splice(
            place,
            placeType === 'insert' ? 0 : 1,
            getWrappedElement(getElementOptions(transferData))
          );
        renderCompositeColumn(compositeContainer, compositeData);
        break;
      case 'material':
        const { ancestor, routes } = getValidIdAncestor(target);
        handlePlace(
          compositeDataMap.get(ancestor[SymbolID]).options,
          routes,
          placeType,
          getWrappedElement(getElementOptions(transferData)),
        );
        renderCompositeColumn(compositeContainer, compositeData);
        return;
      default:
        break;
    }
  });
}

function handlePlace(options, routes, placeType, placeData) {
  const parentRoutes = routes.slice(0, -2);
  const parentOption = parentRoutes
    .filter((_, index) => index % 2 !== 0)
    .reduce((_options, curr) => {
      return _options.children.at(curr);
    }, options.children.at(1));
  parentOption.children.splice(routes.at(-1), placeType === 'insert' ? 0 : 1, placeData);
}

function getValidIdAncestor(element) {
  const routes = [];
  let tempElement = element
  while (tempElement[SymbolID] === undefined) {
    routes.unshift('children', getElementIndex(tempElement));
    tempElement = tempElement.parentElement;
  }
  return {
    ancestor: tempElement,
    routes,
  };
}

function handleSelectCheck(target) {
  const { checked, dataset: { id } } = target;
  const indexOfID = selectedIDs.indexOf(id);
  if (checked && indexOfID === -1) {
    selectedIDs.push(id);
  }
  if (!checked && indexOfID !== -1) {
    selectedIDs.splice(id, 1);
  }
  console.log(selectedIDs);
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(displayText);
    console.log('Content copied to clipboard');
  } catch (error) {
    console.error(error);
  }
}

function handleChangeCompositeType(target, compositeContainer) {
  const { value } = target;
  compositeBox.dataset.compositeType = value;
  switch (value) {
    case 'editor':
      renderCompositeColumn(compositeContainer, compositeData);
      break;
    case 'json':
    case 'template':
      renderCompositeColumn(compositeContainer, null);
      break;
  }
}

function getBone(compositeData) {
  const { attributes } = compositeData;
  if (attributes && attributes['data-role'] === 'placeholder') {
    return undefined;
  }
  if (attributes === undefined
    || !['placeholder', 'parasite'].includes(attributes['data-role'])
  ) {
    return removeParasiteProperty(compositeData);
  }
  const bone = compositeData.children[1];
  if (Array.isArray(bone.children)) {
    bone.children = bone.children.map(getBone).filter(Boolean);
  }
  removeParasiteProperty(bone);
  if (Array.isArray(bone.children)
    && bone.children.length === 0
  ) {
    bone.children = undefined;
  }
  return bone;
}

function removeParasiteProperty(bone) {
  bone.id = undefined;
  bone.lifecycle = undefined;
  bone.materialType = undefined;
  return bone;
}

function handleDelete(element, compositeContainer) {
  const parentElement = element.parentElement;
  if (parentElement.dataset.role === 'root') {
    compositeData = EmptyCompositeData;
  } else {
    const localCompositeData = compositeDataMap.get(parentElement.parentElement.dataset.id).options;
    const elementIndex = getElementIndex(element);
    // bug
    if (!['grid', 'flex', 'block'].includes(element.dataset.display)) {
      localCompositeData.children[1].children.splice(elementIndex, 1, getPlaceholder('material', elementIndex, 'inplace'));
    } else if (parentElement.parentElement.dataset.display === 'grid') {
      localCompositeData.children[1].children.splice(elementIndex, 1, getPlaceholder('grid', elementIndex, 'inplace'));
    } else {
      localCompositeData.children[1].children.splice(getElementIndex(element), 1);
    }
  }
  renderCompositeColumn(compositeContainer, compositeData);
}

function renderCompositeColumn(element, config = {}, options = {}) {
  const { type } = {
    type: compositeBox.dataset.compositeType,
    ...options,
  };

  if (type === 'editor' && parasitized) {
    const addLifecycle = (node) => {
      node.lifecycle = {
        created: (element, options) => {
          const { id } = options;
  
          if (id !== undefined) {
            element[SymbolID] = id;
            compositeDataMap.set(id, {
              element,
              options,
            });
          }
  
          if (element.dataset.headerFixed === 'true') {
            element.querySelector(`#${id}-header-fixed-checkbox`).checked = true;
          }
        },
      };
    };
  
    if (Array.isArray(config)) {
      config.forEach(c => {
        traverse(c, addLifecycle);
      });
      const children = config.map(createElement);
      element.replaceChildren(...children);
      return children;
    }
    
    traverse(config, addLifecycle);
    const child = createElement(config);
    element.replaceChildren(child);
    return child;
  }

  if (type === 'editor' && !parasitized) {
    const bone = getBone(clone(compositeData));
    if (Array.isArray(bone)) {
      const children = bone.map(createElement);
      element.replaceChildren(...children);
      return children;
    }

    const child = createElement(bone);
    element.replaceChildren(child);
    return child;
  }

  if (type === 'json') {
    displayText = JSON.stringify(parasitized ? compositeData : getBone(clone(compositeData)), null, 4);
    const child = createElement({
      tag: 'div',
      text: displayText,
      attributes: {
        style: 'white-space: pre;'
      },
    });
    element.replaceChildren(child);
    return child;
  }

  if (type === 'template') {
    displayText = createElementString(parasitized ? compositeData : getBone(clone(compositeData)));
    const child = createElement({
      tag: 'div',
      text: displayText,
      attributes: {
        style: 'white-space: pre;'
      },
    });
    element.replaceChildren(child);
    return child;
  }

  return null;
}

function getElementOptions(params) {
  const { id, materialType } = params;
  switch (materialType) {
    case 'block':
      return {
        id,
        tag: 'div',
        children: [
          getPlaceholder('block', 1),
          getPlaceholder('block', -1),
        ],
      };
    case 'flex':
      return {
        id,
        tag: 'div',
        attributes: {
          style: `display: flex; flex-direction: row; flex-wrap: nowrap;`,
        },
        children: [
          getPlaceholder('flex', 1),
          getPlaceholder('flex', -1),
        ],
      };
    case 'grid':
      return {
        id,
        materialType,
        tag: 'div',
        attributes: {
          style: `display: grid; grid: 1fr 1fr/1fr 1fr;`,
        },
        children: [
          getPlaceholder('grid', 0, 'inplace'),
          getPlaceholder('grid', 1, 'inplace'),
          getPlaceholder('grid', 2, 'inplace'),
          getPlaceholder('grid', 3, 'inplace'),
        ],
      };
  }
  return params;
}

function getPlaceholder(materialType, place = 1, placeType = 'insert') {
  return {
    tag: 'div',
    text: 'placeholder',
    attributes: {
      'data-role': 'placeholder',
      'data-belong': materialType,
      'data-place': place,
      'data-place-type': placeType,
      style: `width: 100%;height: 40px;`,
    },
  };
}

function getWrappedElement(elementConfig) {
  const { id, materialType, tag } = elementConfig;
  return {
    id,
    tag: 'div',
    attributes: {
      'data-role': 'parasite',
      'data-parasite': 'wrapper',
      'data-header-fixed': defaultHeaderFixed,
      'data-id': id,
      'data-display': materialType,
      classes: 'composite-item-wrapper',
      id: `${id}-wrapper`,
    },
    children: [
      {
        tag: 'div',
        attributes: {
          'data-role': 'parasite',
          'data-id': id,
          classes: 'composite-item-header',
        },
        children: [
          {
            tag: 'input',
            attributes: {
              'data-role': 'parasite',
              'data-parasite': 'element-select-checkbox',
              'data-id': id,
              type: 'checkbox',
              id: `${id}-element-select-checkbox`,
            },
          },
          {
            tag: 'label',
            text: tag,
            attributes: {
              'data-role': 'parasite',
              for: `${id}-element-select-checkbox`,
            },
          },
          {
            tag: 'input',
            attributes: {
              id: `${id}-material-name`,
              type: 'text',
              placeholder: 'material name'
            },
          },
          {
            tag: 'button',
            text: 'Save',
            attributes: {
              'data-role': 'parasite',
              'data-action': 'handleSaveAsMaterial',
              'data-id': id,
            },
          },
          {
            tag: 'input',
            attributes: {
              'data-role': 'parasite',
              'data-parasite': 'header-fixed-checkbox',
              'data-id': id,
              type: 'checkbox',
              id: `${id}-header-fixed-checkbox`,
              style: 'margin-left: auto;',
            },
          },
          {
            tag: 'label',
            text: 'HeaderFixed',
            attributes: {
              'data-role': 'parasite',
              for: `${id}-header-fixed-checkbox`,
            },
          },
          {
            tag: 'button',
            text: 'Delete',
            attributes: {
              'data-role': 'parasite',
              'data-action': 'delete',
              'data-id': id,
            },
          },
        ],
      },
      elementConfig,
    ],
  };
}

function getId() {
  return `${gene(/[a-zA-Z]\w{9}/)}_${Date.now()}`;
}

function getAttributeInputType(attribute) {
  if (['color', 'background-color'].includes(attribute)) {
    return 'color';
  }
  return 'text';
}

function renderAttribute(options) {
  const { id, children: [_, bone] } = options;
  renderAttributeContainer(id, bone);
  renderStyleContainer(id, bone);
}

function renderAttributeContainer(id, bone) {
  const { attributes } = bone;
  if (attributes === undefined) {
    attributeContainer.replaceChildren();
    return;
  }
  const attributeOptions = [];
  Object.keys(attributes)
    .forEach(attribute => {
      if (attribute === 'style') {
        return;
      }
      attributeOptions.push(
        {
          tag: 'label',
          text: `${attribute}:`,
          attributes: {
            for: `${id}-${attribute}`,
          },
        },
        {
          tag: 'input',
          attributes: {
            'data-role': 'attribute-input',
            'data-attribute-type': 'attribute',
            'data-attribute-name': attribute,
            'data-id': id,
            id: `${id}-${attribute}`,
            type: getAttributeInputType(attribute),
            value: attributes[attribute],
          },
        },
      );
    });
  attributeContainer.replaceChildren(...createElement(attributeOptions));
}

function renderStyleContainer(id, bone) {
  let styles = {};
  if (bone.attributes !== undefined
    && bone.attributes.style !== undefined
  ) {
    styles = bone.attributes.style.split(';').filter(Boolean).reduce((acc, curr) => {
      const [tempStyleProperty, tempValue] = curr.split(':');
      acc[tempStyleProperty.trim()] = tempValue.trim();
      return acc;
    }, {});
  }

  const styleAttributes = {
    height: '',
    color: '',
    'background-color': '',
    ...styles,
  };
  const styleAttributeOptions = [];
  Object.keys(styleAttributes).forEach(styleName => {
    styleAttributeOptions.push(
      {
        tag: 'label',
        text: `${styleName}:`,
        attributes: {
          for: `${id}-style-${styleName}`,
        },
      },
      {
        tag: 'input',
        attributes: {
          'data-role': 'attribute-input',
          'data-attribute-type': 'style',
          'data-attribute-name': styleName,
          'data-id': id,
          id: `${id}-style-${styleName}`,
          type: 'text',
          value: styleAttributes[styleName],
        },
      },
    );
  });
  styleContainer.replaceChildren(...createElement(styleAttributeOptions));
}

function updateAttribute(attributeElement) {
  const { dataset: { id, attributeType, attributeName }, value } = attributeElement;
  const bone = compositeDataMap.get(id).options.children[1];

  if (attributeType === 'attribute') {
    if (bone.attributes === undefined) {
      bone.attributes = { attributeName: value };
    } else {
      bone.attributes[attributeName] = value;
    }
  }

  if (attributeType === 'style') {
    const styleText = `${attributeName}: ${value}`;

    if (!CSS.supports(styleText)) {
      console.error(`${value} is not supported for ${attributeName}!`);
      return;
    }

    if (bone.materialType === 'grid'
      && attributeName === 'grid'
    ) {
      const [rowString, colString] = value.split('/');
      const rows = rowString.split(' ').filter(Boolean);
      const cols = colString.split(' ').filter(Boolean);
      const oldLength = bone.children.length;
      const newLength = rows.length * cols.length;
      if (newLength > oldLength) {
        bone.children.push(...(Array(newLength - oldLength).fill(0)
          .map((_, index) => getPlaceholder('grid', oldLength + index, 'inplace'))));
      }
      if (newLength < oldLength) {
        bone.children.length = newLength;
      }
    }
    if (bone.attributes === undefined) {
      bone.attributes = {
        style: styleText,
      };
    } else if (bone.attributes.style === undefined) {
      bone.attributes.style = styleText;
    } else {
      const oldStyle = bone.attributes.style;
      bone.attributes.style = oldStyle.replaceAll(
        new RegExp(`${attributeName}:[^;]+`, 'g'),
        styleText
      );
    }
  }
}
